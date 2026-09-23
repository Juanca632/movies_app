from typing import Annotated

from fastapi import Depends, Request

from app.clients.tmdb import TMDBClient
from app.core.config import Settings, get_settings
from app.services.discover import DiscoverService
from app.services.media import MediaService
from app.services.people import PeopleService


def get_tmdb(request: Request) -> TMDBClient:
    return request.app.state.tmdb


def get_media_service(
    tmdb: Annotated[TMDBClient, Depends(get_tmdb)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> MediaService:
    return MediaService(tmdb, settings)


MediaServiceDep = Annotated[MediaService, Depends(get_media_service)]


def get_people_service(
    tmdb: Annotated[TMDBClient, Depends(get_tmdb)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> PeopleService:
    return PeopleService(tmdb, settings)


PeopleServiceDep = Annotated[PeopleService, Depends(get_people_service)]


def get_discover_service(
    tmdb: Annotated[TMDBClient, Depends(get_tmdb)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> DiscoverService:
    return DiscoverService(tmdb, settings)


DiscoverServiceDep = Annotated[DiscoverService, Depends(get_discover_service)]
