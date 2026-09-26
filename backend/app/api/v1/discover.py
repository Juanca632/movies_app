from typing import Annotated

from fastapi import APIRouter, Query

from app.api.deps import DiscoverServiceDep
from app.schemas.media import Genre, MediaSummary, MediaType, Page, Provider, Region
from app.services.discover import Sort

router = APIRouter(tags=["Discover"])

RegionCode = Annotated[str, Query(pattern="^[A-Z]{2}$")]


@router.get("/genres/{media_type}", summary="Genres for movies or TV shows")
async def list_genres(media_type: MediaType, service: DiscoverServiceDep) -> list[Genre]:
    return await service.genres(media_type)


@router.get("/regions", summary="Countries with streaming availability data")
async def list_regions(service: DiscoverServiceDep) -> list[Region]:
    return await service.regions()


@router.get("/providers/{media_type}", summary="Streaming services available in a country")
async def list_providers(
    media_type: MediaType, service: DiscoverServiceDep, region: RegionCode = "US"
) -> list[Provider]:
    return await service.providers(media_type, region)


@router.get("/discover/{media_type}", summary="Browse movies or TV shows by genre and service")
async def discover(
    media_type: MediaType,
    service: DiscoverServiceDep,
    sort: Sort = "popular",
    genre: Annotated[int | None, Query(ge=1)] = None,
    provider: Annotated[int | None, Query(ge=1)] = None,
    region: RegionCode | None = None,
    page: Annotated[int, Query(ge=1, le=500)] = 1,
) -> Page[MediaSummary]:
    return await service.discover(
        media_type,
        sort=sort,
        page=page,
        genres=[genre] if genre else [],
        providers=[provider] if provider else [],
        region=region,
    )
