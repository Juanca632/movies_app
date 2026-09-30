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
    # Optional: the AI assistant. Without a key it is disabled.
    anthropic_api_key: str | None = None
    assistant_model: str = "claude-haiku-4-5"
    assistant_max_turns: int = 6
    # Every question costs money: limits per visitor and for the whole site.
    assistant_hourly_limit: int = 10  # per IP
    assistant_daily_limit: int = 300  # all visitors together
    cache_ttl_answers: int = 3600  # seconds: the same question in the same country

    # Optional: Postgres for accounts and lists. Without it the app stays public-only.
    database_url: str | None = None
    # Optional: Google sign-in. All three plus the database are needed, or sign-in is off.
    google_client_id: str | None = None
    google_client_secret: str | None = None
    session_secret: str | None = None  # signs the short-lived OAuth state cookie
    session_days: int = 30  # sliding: every visit pushes the expiry back
    # The site's public origin (https://example.com). Unset, it comes from the request's Host,
    # which is right behind Vercel and the Vite dev proxy.
    public_url: str | None = None
    # Browsers accept Secure cookies on http://localhost too; turn off only for other HTTP hosts.
    cookie_secure: bool = True

    tmdb_language: str = "en-US"
    tmdb_timeout: float = 5.0
    tmdb_retries: int = 2

    cache_ttl_lists: int = 600  # seconds: popular, top rated, search...
    cache_ttl_details: int = 3600  # seconds: movie/tv/person details
    cache_ttl_static: int = 86400  # seconds: genres, countries, streaming services
    cache_max_items: int = 1024

    cors_origins: list[str] = ["http://localhost:5173", "http://localhost:3000"]

    @property
    def accounts_enabled(self) -> bool:
        needed = (self.google_client_id, self.google_client_secret, self.session_secret)
        return bool(self.database_url) and all(needed)


@lru_cache
def get_settings() -> Settings:
    return Settings()
