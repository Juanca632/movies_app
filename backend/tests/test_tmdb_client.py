import httpx
import pytest
import respx

from app.clients.tmdb import TMDBClient, TMDBNotFoundError, TMDBUnavailableError

BASE = "https://tmdb.test/3"


@pytest.fixture
async def client(settings):
    tmdb = TMDBClient(settings)
    yield tmdb
    await tmdb.aclose()


@respx.mock
async def test_get_sends_api_key_and_language(client):
    route = respx.get(f"{BASE}/movie/1").mock(return_value=httpx.Response(200, json={"id": 1}))

    assert await client.get("/movie/1") == {"id": 1}

    params = route.calls.last.request.url.params
    assert params["api_key"] == "test-key"
    assert params["language"] == "en-US"


@respx.mock
async def test_get_caches_when_ttl_given(client):
    route = respx.get(f"{BASE}/movie/popular").mock(
        return_value=httpx.Response(200, json={"results": []})
    )

    await client.get("/movie/popular", ttl=60)
    await client.get("/movie/popular", ttl=60)

    assert route.call_count == 1


@respx.mock
async def test_get_does_not_cache_without_ttl(client):
    route = respx.get(f"{BASE}/movie/popular").mock(
        return_value=httpx.Response(200, json={"results": []})
    )

    await client.get("/movie/popular")
    await client.get("/movie/popular")

    assert route.call_count == 2


@respx.mock
async def test_different_params_use_different_cache_entries(client):
    route = respx.get(f"{BASE}/movie/popular").mock(
        return_value=httpx.Response(200, json={"results": []})
    )

    await client.get("/movie/popular", {"page": 1}, ttl=60)
    await client.get("/movie/popular", {"page": 2}, ttl=60)

    assert route.call_count == 2


@respx.mock
async def test_404_raises_not_found_without_retry(client):
    route = respx.get(f"{BASE}/movie/999").mock(return_value=httpx.Response(404))

    with pytest.raises(TMDBNotFoundError):
        await client.get("/movie/999")

    assert route.call_count == 1


@respx.mock
async def test_5xx_is_retried_then_succeeds(client):
    route = respx.get(f"{BASE}/movie/1").mock(
        side_effect=[httpx.Response(503), httpx.Response(200, json={"id": 1})]
    )

    assert await client.get("/movie/1") == {"id": 1}
    assert route.call_count == 2


@respx.mock
async def test_gives_up_after_retries(client):
    route = respx.get(f"{BASE}/movie/1").mock(return_value=httpx.Response(500))

    with pytest.raises(TMDBUnavailableError):
        await client.get("/movie/1")

    assert route.call_count == 3


@respx.mock
async def test_network_error_becomes_unavailable(client):
    respx.get(f"{BASE}/movie/1").mock(side_effect=httpx.ConnectTimeout("boom"))

    with pytest.raises(TMDBUnavailableError):
        await client.get("/movie/1")


@respx.mock
async def test_other_4xx_is_not_retried(client):
    route = respx.get(f"{BASE}/movie/1").mock(return_value=httpx.Response(401))

    with pytest.raises(TMDBUnavailableError):
        await client.get("/movie/1")

    assert route.call_count == 1
