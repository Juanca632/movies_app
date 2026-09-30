from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Response, status

from app.api.deps import DbDep, MediaServiceDep
from app.api.session import (
    AuthServiceDep,
    CurrentUserDep,
    SameOrigin,
    SettingsDep,
    clear_session_cookie,
)
from app.schemas.me import ListKind, Profile, SavedTitle
from app.schemas.media import MediaType
from app.services.lists import MAX_PER_LIST, ListFullError, ListsService

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
) -> Response:
    await lists.remove(kind, media_type, media_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
