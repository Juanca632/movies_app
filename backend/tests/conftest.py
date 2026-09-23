import pytest

from app.core.config import Settings


@pytest.fixture
def settings() -> Settings:
    return Settings(
        tmdb_api_key="test-key",
        tmdb_api_url="https://tmdb.test/3",
        tmdb_retries=2,
        omdb_api_key="omdb-test-key",
        omdb_api_url="https://omdb.test/",
    )


@pytest.fixture
async def tmdb(settings):
    from app.clients.tmdb import TMDBClient

    client = TMDBClient(settings)
    yield client
    await client.aclose()


@pytest.fixture
async def omdb(settings):
    from app.clients.omdb import OMDbClient

    client = OMDbClient(settings)
    yield client
    await client.aclose()


@pytest.fixture
async def api(settings, tmdb, omdb):
    import httpx

    from app.api.deps import get_omdb, get_tmdb
    from app.core.config import get_settings
    from app.main import create_app

    app = create_app()
    app.dependency_overrides[get_tmdb] = lambda: tmdb
    app.dependency_overrides[get_omdb] = lambda: omdb
    app.dependency_overrides[get_settings] = lambda: settings
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://api.test") as client:
        yield client
