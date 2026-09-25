from typing import Annotated

from fastapi import APIRouter, HTTPException, Path, Query, status

from app.api.deps import MediaServiceDep
from app.schemas.media import MediaDetail, MediaSummary, MediaType, Page, Season
from app.services.media import CATEGORIES

router = APIRouter(tags=["Media"])


@router.get("/{media_type}", summary="List movies or TV shows by category")
async def list_media(
    media_type: MediaType,
    service: MediaServiceDep,
    category: str = "popular",
    page: Annotated[int, Query(ge=1, le=500)] = 1,
    region: Annotated[str | None, Query(pattern="^[A-Z]{2}$")] = None,
) -> Page[MediaSummary]:
    if category not in CATEGORIES[media_type]:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_CONTENT,
            f"Invalid category for {media_type}. Allowed: {', '.join(CATEGORIES[media_type])}",
        )
    return await service.list(media_type, category, page, region)


@router.get("/tv/{tv_id}/season/{season_number}", summary="A TV season with its episodes")
async def get_season(
    tv_id: int,
    season_number: Annotated[int, Path(ge=0, le=1000)],
    service: MediaServiceDep,
) -> Season:
    return await service.season(tv_id, season_number)


@router.get("/{media_type}/{media_id}", summary="Movie or TV show with everything the page needs")
async def get_media(
    media_type: MediaType,
    media_id: int,
    service: MediaServiceDep,
    region: Annotated[str, Query(pattern="^[A-Z]{2}$")] = "US",
) -> MediaDetail:
    return await service.detail(media_type, media_id, region)
