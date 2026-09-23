from typing import Annotated, Literal

from pydantic import BaseModel, Field

from app.schemas.media import MediaSummary


class PersonSummary(BaseModel):
    id: int
    media_type: Literal["person"] = "person"
    name: str
    profile_path: str | None = None
    known_for_department: str | None = None
    known_for: list[str] = []  # titles, most notable first
    popularity: float = 0


class PersonDetail(PersonSummary):
    biography: str = ""
    birthday: str | None = None
    deathday: str | None = None
    place_of_birth: str | None = None
    also_known_as: list[str] = []
    movies: list[MediaSummary] = []
    tv_shows: list[MediaSummary] = []


SearchResult = Annotated[MediaSummary | PersonSummary, Field(discriminator="media_type")]
