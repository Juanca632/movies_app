import pytest

from app.core.config import Settings


@pytest.fixture
def settings() -> Settings:
    return Settings(
        tmdb_api_key="test-key",
        tmdb_api_url="https://tmdb.test/3",
        tmdb_retries=2,
    )
