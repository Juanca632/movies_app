from typing import Annotated

from fastapi import Depends, Request

from app.clients.tmdb import TMDBClient
from app.core.config import Settings, get_settings
from app.services.media import MediaService


def get_tmdb(request: Request) -> TMDBClient:
    return request.app.state.tmdb


def get_media_service(
    tmdb: Annotated[TMDBClient, Depends(get_tmdb)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> MediaService:
    return MediaService(tmdb, settings)


MediaServiceDep = Annotated[MediaService, Depends(get_media_service)]
