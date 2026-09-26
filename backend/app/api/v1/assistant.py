import logging
from collections.abc import AsyncIterator

import anthropic
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import StreamingResponse

from app.api.deps import AssistantDep
from app.clients.tmdb import TMDBError
from app.schemas.assistant import AskRequest, AssistantEvent, Failure
from app.services.assistant import AssistantError

log = logging.getLogger(__name__)

router = APIRouter(tags=["Assistant"])

UNAVAILABLE = "The assistant is not available right now. Try again later."


def _client_ip(request: Request) -> str:
    # Both nginx and Vercel put the visitor's address in X-Real-IP.
    return request.headers.get("x-real-ip") or (request.client.host if request.client else "?")


def _sse(event: AssistantEvent) -> str:
    return f"data: {event.model_dump_json()}\n\n"


@router.post(
    "/ask",
    summary="Ask the AI assistant what to watch",
    description="Send the question, plus a recap of earlier turns for follow-ups. Answers with "
    "Server-Sent Events: `status` updates while it works, then one `answer` (or `error`).",
    response_class=StreamingResponse,
)
async def ask(request: Request, body: AskRequest, assistant: AssistantDep) -> StreamingResponse:
    if assistant is None:
        raise HTTPException(503, UNAVAILABLE)
    question = " ".join(body.question.split())
    region, history = body.region, body.history
    # Only a conversation's first question can come from the cache (see AssistantService.ask).
    cached = None if history else assistant.cached(question, region)
    if cached is None and not assistant.allow(_client_ip(request)):
        raise HTTPException(429, "Too many questions for now. Try again in a while.")

    async def events() -> AsyncIterator[str]:
        if cached is not None:
            yield _sse(cached)
            return
        try:
            async for event in assistant.ask(question, region, history):
                yield _sse(event)
        except AssistantError as error:
            yield _sse(Failure(message=str(error)))
        except (anthropic.APIError, TMDBError):
            log.exception("assistant failed")
            yield _sse(Failure(message=UNAVAILABLE))

    # No caching anywhere, and no proxy buffering, so each update reaches the browser at once.
    headers = {"Cache-Control": "no-store", "X-Accel-Buffering": "no"}
    return StreamingResponse(events(), media_type="text/event-stream", headers=headers)
