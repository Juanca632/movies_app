from typing import Generic, Literal, TypeVar

from pydantic import BaseModel

MediaType = Literal["movie", "tv"]

T = TypeVar("T")


class Page(BaseModel, Generic[T]):
    page: int
    total_pages: int
    total_results: int
    results: list[T]


class MediaSummary(BaseModel):
    """A movie or TV show as shown in lists and carousels."""

    id: int
    media_type: MediaType
    title: str
    overview: str = ""
    poster_path: str | None = None
    backdrop_path: str | None = None
    release_date: str | None = None
    vote_average: float = 0
    vote_count: int = 0
    genre_ids: list[int] = []


class Genre(BaseModel):
    id: int
    name: str


class CastMember(BaseModel):
    id: int
    name: str
    character: str | None = None
    profile_path: str | None = None


class Image(BaseModel):
    file_path: str
    width: int
    height: int
    vote_average: float = 0


class Images(BaseModel):
    backdrops: list[Image] = []
    posters: list[Image] = []


class Provider(BaseModel):
    provider_id: int
    provider_name: str
    logo_path: str | None = None


class Region(BaseModel):
    code: str  # ISO 3166-1 alpha-2
    name: str


class Providers(BaseModel):
    region: str
    link: str | None = None
    flatrate: list[Provider] = []
    rent: list[Provider] = []
    buy: list[Provider] = []


class MediaDetail(MediaSummary):
    tagline: str = ""
    status: str | None = None
    homepage: str | None = None
    original_language: str | None = None
    genres: list[Genre] = []
    runtime: int | None = None  # minutes (per episode for TV)
    number_of_seasons: int | None = None
    number_of_episodes: int | None = None
    cast: list[CastMember] = []
    images: Images = Images()
    providers: Providers | None = None
    recommendations: list[MediaSummary] = []
