from functools import lru_cache

from pydantic import AliasChoices, Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    tmdb_api_key: str = Field(
        validation_alias=AliasChoices("TMDB_API_KEY", "THE_MOVIE_DB_API_KEY"),
    )
    tmdb_api_url: str = Field(
        default="https://api.themoviedb.org/3",
        validation_alias=AliasChoices("TMDB_API_URL", "THE_MOVIE_DB_API_URL"),
    )
    # Optional: awards and critic scores. Without a key those sections are simply hidden.
    omdb_api_key: str | None = None
    omdb_api_url: str = "https://www.omdbapi.com/"

    tmdb_language: str = "en-US"
    tmdb_timeout: float = 5.0
    tmdb_retries: int = 2

    cache_ttl_lists: int = 600  # seconds: popular, top rated, search...
    cache_ttl_details: int = 3600  # seconds: movie/tv/person details
    cache_ttl_static: int = 86400  # seconds: genres, countries, streaming services
    cache_max_items: int = 1024

    cors_origins: list[str] = ["http://localhost:5173", "http://localhost:3000"]


@lru_cache
def get_settings() -> Settings:
    return Settings()
