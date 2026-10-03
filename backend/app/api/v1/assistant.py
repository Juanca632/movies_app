import logging
from collections.abc import AsyncIterator
from typing import Annotated

import anthropic
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import StreamingResponse
from sqlalchemy.exc import SQLAlchemyError

from app.api.deps import AssistantDep, MediaServiceDep, OptionalSessionmakerDep
from app.api.session import SESSION_COOKIE, SettingsDep
from app.clients.tmdb import TMDBError
from app.schemas.assistant import AskRequest, AssistantEvent, Failure, PickRef, Taste
from app.schemas.me import SavedTitle
from app.services.assistant import MAX_TASTE, AssistantError
from app.services.auth import AuthService
from app.services.lists import ListsService

log = logging.getLogger(__name__)

router = APIRouter(tags=["Assistant"])

UNAVAILABLE = "The assistant is not available right now. Try again later."


def _client_ip(request: Request) -> str:
    # Both nginx and Vercel put the visitor's address in X-Real-IP.
    return request.headers.get("x-real-ip") or (request.client.host if request.client else "?")


def _refs(titles: list[SavedTitle]) -> list[PickRef]:
    return [PickRef(media_type=t.media_type, id=t.id, title=t.title[:200]) for t in titles]


async def get_taste(
    request: Request,
    sessionmaker: OptionalSessionmakerDep,
    settings: SettingsDep,
    media: MediaServiceDep,
) -> Taste | None:
    """What the signed-in user saved, to personalise the answer; None for everyone else.

    Optional all the way: signed out, accounts off, or the database failing, the assistant
    simply answers like it does for anyone.
    """
    token = request.cookies.get(SESSION_COOKIE)
    if not token or sessionmaker is None or not settings.accounts_enabled:
        return None
    try:
        async with sessionmaker() as db:
            # A session due for extension gets it on the user's next /me call, not here: this
            # response streams, and its cookies are not worth the complication.
            user, _ = await AuthService(db, settings.session_days).user_for(token)
            if user is None:
                return None
            lists = ListsService(db, media, user.id)
            favorites = await lists.titles("favorite", limit=MAX_TASTE)
            watchlist = await lists.titles("watchlist", limit=MAX_TASTE)
    except SQLAlchemyError:
        log.exception("could not load the user's lists for the assistant")
        return None
    if not favorites and not watchlist:
        return None
    return Taste(favorites=_refs(favorites), watchlist=_refs(watchlist))


TasteDep = Annotated[Taste | None, Depends(get_taste)]


def _sse(event: AssistantEvent) -> str:
    return f"data: {event.model_dump_json()}\n\n"


@router.post(
    "/ask",
    summary="Ask the AI assistant what to watch",
    description="Send the question, plus a recap of earlier turns for follow-ups. Answers with "
    "Server-Sent Events: `status` updates while it works, then one `answer` (or `error`).",
    response_class=StreamingResponse,
)
async def ask(
    request: Request,
    body: AskRequest,
    assistant: AssistantDep,
    taste: TasteDep,
) -> StreamingResponse:
    if assistant is None:
        raise HTTPException(503, UNAVAILABLE)
    question = " ".join(body.question.split())
    region, history = body.region, body.history
    # Only a conversation's first question, and nobody's personal answer, can come from the
    # cache (see AssistantService.ask).
    cached = None if history or taste else assistant.cached(question, region)
    if cached is None and not assistant.allow(_client_ip(request)):
        raise HTTPException(429, "Too many questions for now. Try again in a while.")

    async def events() -> AsyncIterator[str]:
        if cached is not None:
            yield _sse(cached)
            return
        try:
            async for event in assistant.ask(question, region, history, taste):
                yield _sse(event)
        except AssistantError as error:
            yield _sse(Failure(message=str(error)))
        except (anthropic.APIError, TMDBError):
            log.exception("assistant failed")
            yield _sse(Failure(message=UNAVAILABLE))
        except Exception:
            # The 200 and the headers are already sent: the only way to report it is an event.
            log.exception("assistant failed unexpectedly")
            yield _sse(Failure(message=UNAVAILABLE))

    # No caching anywhere, and no proxy buffering, so each update reaches the browser at once.
    headers = {"Cache-Control": "no-store", "X-Accel-Buffering": "no"}
    return StreamingResponse(events(), media_type="text/event-stream", headers=headers)
