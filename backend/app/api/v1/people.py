from typing import Annotated

from fastapi import APIRouter, Query

from app.api.deps import PeopleServiceDep
from app.schemas.media import Page
from app.schemas.people import PersonDetail, PersonSummary

router = APIRouter(prefix="/person", tags=["People"])


@router.get("/trending", summary="Trending people this week")
async def trending_people(
    service: PeopleServiceDep,
    page: Annotated[int, Query(ge=1, le=500)] = 1,
) -> Page[PersonSummary]:
    return await service.trending(page)


@router.get("/{person_id}", summary="Person with their movie and TV credits")
async def get_person(person_id: int, service: PeopleServiceDep) -> PersonDetail:
    return await service.detail(person_id)
