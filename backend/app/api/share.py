"""Link-preview pages for crawlers, on the same URLs as the SPA (see app/services/share.py)."""

from fastapi import APIRouter
from fastapi.responses import HTMLResponse

from app.api.deps import MediaServiceDep, PeopleServiceDep
from app.clients.tmdb import TMDBNotFoundError
from app.services.share import DEFAULT_CARD, media_card, person_card, render

router = APIRouter(include_in_schema=False)


def _not_found() -> HTMLResponse:
    return HTMLResponse(render(DEFAULT_CARD), status_code=404)


# Public URLs keep the historic "/tv-show" prefix; the slug after the id is only cosmetic.
@router.get("/movie/{media_id}")
@router.get("/movie/{media_id}/{slug}")
async def movie_preview(media_id: int, service: MediaServiceDep) -> HTMLResponse:
    try:
        media = await service.detail("movie", media_id, "US")
    except TMDBNotFoundError:
        return _not_found()
    return HTMLResponse(render(media_card(media)))


@router.get("/tv-show/{media_id}")
@router.get("/tv-show/{media_id}/{slug}")
async def tv_preview(media_id: int, service: MediaServiceDep) -> HTMLResponse:
    try:
        media = await service.detail("tv", media_id, "US")
    except TMDBNotFoundError:
        return _not_found()
    return HTMLResponse(render(media_card(media)))


@router.get("/person/{person_id}")
@router.get("/person/{person_id}/{slug}")
async def person_preview(person_id: int, service: PeopleServiceDep) -> HTMLResponse:
    try:
        person = await service.detail(person_id)
    except TMDBNotFoundError:
        return _not_found()
    return HTMLResponse(render(person_card(person)))
