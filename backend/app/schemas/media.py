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


class PersonRef(BaseModel):
    """Just enough to link to a person: a director, a show's creator..."""

    id: int
    name: str


class CollectionRef(BaseModel):
    """The saga a movie belongs to (Harry Potter, Star Wars...)."""

    id: int
    name: str
    poster_path: str | None = None
    backdrop_path: str | None = None


class Episode(BaseModel):
    id: int
    season_number: int
    episode_number: int
    name: str
    overview: str = ""
    air_date: str | None = None
    runtime: int | None = None  # minutes
    still_path: str | None = None
    vote_average: float = 0


class SeasonSummary(BaseModel):
    season_number: int  # 0 holds the specials
    name: str
    air_date: str | None = None
    episode_count: int = 0
    poster_path: str | None = None


class Season(SeasonSummary):
    overview: str = ""
    episodes: list[Episode] = []


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


class Video(BaseModel):
    key: str  # YouTube video id
    name: str


class CriticScore(BaseModel):
    source: Literal["imdb", "rotten_tomatoes", "metacritic"]
    value: str  # as displayed: "8.8", "86%", "74"


class Acclaim(BaseModel):
    """Awards and critic scores from OMDb (IMDb data)."""

    awards: str | None = None  # "Won 4 Oscars. 160 wins & 220 nominations total"
    scores: list[CriticScore] = []


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
    imdb_id: str | None = None
    genres: list[Genre] = []
    runtime: int | None = None  # minutes (per episode for TV)
    number_of_seasons: int | None = None
    number_of_episodes: int | None = None
    seasons: list[SeasonSummary] = []  # TV only: regular seasons in order, specials last
    next_episode: Episode | None = None  # TV only, when one is scheduled
    creators: list[PersonRef] = []  # directors of a movie, creators of a TV show
    cast: list[CastMember] = []
    images: Images = Images()
    providers: Providers | None = None
    trailer: Video | None = None
    recommendations: list[MediaSummary] = []
    collection: CollectionRef | None = None  # movies only


class Collection(CollectionRef):
    overview: str = ""
    parts: list[MediaSummary] = []  # in release order, unreleased last
