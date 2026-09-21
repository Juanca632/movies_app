from typing import Annotated

from fastapi import APIRouter, Query

from app.api.deps import PeopleServiceDep
from app.schemas.media import Page
from app.schemas.people import SearchResult

router = APIRouter(tags=["Search"])


@router.get("/search", summary="Search movies, TV shows and people")
async def search(
    service: PeopleServiceDep,
    q: Annotated[str, Query(min_length=1, max_length=100)],
    page: Annotated[int, Query(ge=1, le=500)] = 1,
) -> Page[SearchResult]:
    return await service.search(q.strip(), page)
