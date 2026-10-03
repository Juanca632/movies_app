import logging
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.exc import SQLAlchemyError

from app.api.deps import AssistantDep, DbDep, MediaServiceDep
from app.api.session import (
    AuthServiceDep,
    CurrentUserDep,
    SameOrigin,
    SettingsDep,
    clear_session_cookie,
)
from app.schemas.assistant import Answer
from app.schemas.me import ForYou, ListKind, Profile, SavedTitle
from app.schemas.media import MediaType
from app.services.ai_picks import AiPicksService
from app.services.lists import MAX_PER_LIST, ListFullError, ListsService
from app.services.recommendations import cached_for_you

log = logging.getLogger(__name__)

router = APIRouter(prefix="/me", tags=["Accounts"])


def get_lists(db: DbDep, media: MediaServiceDep, user: CurrentUserDep) -> ListsService:
    return ListsService(db, media, user.id)


ListsDep = Annotated[ListsService, Depends(get_lists)]


@router.get(
    "",
    summary="The signed-in user",
    description="401 when signed out; 503 when accounts are not set up, so the UI can hide "
    "sign-in altogether.",
)
async def me(user: CurrentUserDep) -> Profile:
    return Profile(name=user.name, email=user.email, avatar_url=user.avatar_url)


@router.delete(
    "",
    summary="Delete the signed-in user's account",
    description="Removes the user, every session and both lists, at once and for good.",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[SameOrigin],
)
async def delete_account(
    user: CurrentUserDep, auth: AuthServiceDep, settings: SettingsDep
) -> Response:
    await auth.delete_account(user)
    response = Response(status_code=status.HTTP_204_NO_CONTENT)
    clear_session_cookie(response, settings)
    return response


@router.get(
    "/recommendations",
    summary="Recommendations from the signed-in user's lists",
    description="Top picks drawn from both lists, plus rows of titles like recent favourites. "
    "Titles already saved are left out; empty lists give empty recommendations.",
)
async def recommendations(lists: ListsDep, media: MediaServiceDep) -> ForYou:
    favorites, watchlist = await lists.titles("favorite"), await lists.titles("watchlist")
    return await cached_for_you(media, favorites, watchlist)


@router.get(
    "/ai-picks",
    summary="Titles the AI picked from the signed-in user's lists",
    description="Kept and reused: new picks are only made when the lists or the country "
    "changed, at most once a day, so the first load after a change can take a few seconds. "
    "Null with nothing saved, or when the assistant is not available.",
)
async def ai_picks(
    lists: ListsDep,
    db: DbDep,
    assistant: AssistantDep,
    user: CurrentUserDep,
    region: Annotated[str, Query(pattern="^[A-Z]{2}$")] = "US",
) -> Answer | None:
    favorites, watchlist = await lists.titles("favorite"), await lists.titles("watchlist")
    try:
        return await AiPicksService(db, assistant, user.id).picks(favorites, watchlist, region)
    except SQLAlchemyError:
        # e.g. deployed before `alembic upgrade head`: the row is extra, the home page is not.
        log.exception("could not read or store AI picks")
        return None


# After the fixed paths above: "/{kind}" would match them and answer 422.
@router.get("/{kind}", summary="A list of the signed-in user, most recently saved first")
async def list_titles(kind: ListKind, lists: ListsDep) -> list[SavedTitle]:
    return await lists.titles(kind)


@router.put(
    "/{kind}/{media_type}/{media_id}",
    summary="Save a title to a list",
    description="Idempotent: saving a title that is already in the list changes nothing.",
    dependencies=[SameOrigin],
)
async def save_title(
    kind: ListKind, media_type: MediaType, media_id: int, lists: ListsDep
) -> SavedTitle:
    try:
        return await lists.add(kind, media_type, media_id)
    except ListFullError:
        raise HTTPException(
            status.HTTP_409_CONFLICT, f"A list holds at most {MAX_PER_LIST} titles"
        ) from None


@router.delete(
    "/{kind}/{media_type}/{media_id}",
    summary="Remove a title from a list",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[SameOrigin],
)
async def remove_title(
    kind: ListKind, media_type: MediaType, media_id: int, lists: ListsDep
) -> None:
    # Returning None, not a Response, keeps cookies set by dependencies (a session refresh).
    await lists.remove(kind, media_type, media_id)
