from fastapi import APIRouter

from app.api.deps import PeopleServiceDep
from app.schemas.people import PersonDetail, PersonSummary

router = APIRouter(prefix="/person", tags=["People"])


@router.get("/popular", summary="Well-known people right now")
async def popular_people(service: PeopleServiceDep) -> list[PersonSummary]:
    return await service.popular()


@router.get("/{person_id}", summary="Person with their movie and TV credits")
async def get_person(person_id: int, service: PeopleServiceDep) -> PersonDetail:
    return await service.detail(person_id)
