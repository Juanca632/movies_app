import httpx
import respx

OMDB = "https://omdb.test/"
TMDB = "https://tmdb.test/3"

INCEPTION = {
    "Response": "True",
    "Title": "Inception",
    "Awards": "Won 4 Oscars. 160 wins & 220 nominations total",
    "Ratings": [
        {"Source": "Internet Movie Database", "Value": "8.8/10"},
        {"Source": "Rotten Tomatoes", "Value": "86%"},
        {"Source": "Metacritic", "Value": "74/100"},
        {"Source": "Somebody Else", "Value": "5 stars"},
    ],
}


@respx.mock
async def test_acclaim_normalises_awards_and_scores(api):
    route = respx.get(OMDB).mock(return_value=httpx.Response(200, json=INCEPTION))

    response = await api.get("/api/v1/acclaim/tt1375666")

    assert route.calls.last.request.url.params["i"] == "tt1375666"
    assert response.json() == {
        "awards": "Won 4 Oscars. 160 wins & 220 nominations total",
        "scores": [
            {"source": "imdb", "value": "8.8"},
            {"source": "rotten_tomatoes", "value": "86%"},
            {"source": "metacritic", "value": "74"},
        ],
    }


@respx.mock
async def test_acclaim_is_cached(api):
    route = respx.get(OMDB).mock(return_value=httpx.Response(200, json=INCEPTION))

    await api.get("/api/v1/acclaim/tt1375666")
    await api.get("/api/v1/acclaim/tt1375666")

    assert route.call_count == 1


@respx.mock
async def test_missing_values_and_unknown_titles_are_empty(api):
    respx.get(OMDB, params={"i": "tt0903747"}).mock(
        return_value=httpx.Response(200, json={"Response": "True", "Awards": "N/A", "Ratings": []})
    )
    respx.get(OMDB, params={"i": "tt0000001"}).mock(
        return_value=httpx.Response(200, json={"Response": "False", "Error": "Incorrect IMDb ID."})
    )

    assert (await api.get("/api/v1/acclaim/tt0903747")).json() == {"awards": None, "scores": []}
    assert (await api.get("/api/v1/acclaim/tt0000001")).json() == {"awards": None, "scores": []}


@respx.mock
async def test_omdb_outage_is_empty_and_not_cached(api):
    route = respx.get(OMDB).mock(
        side_effect=[httpx.ConnectError("down"), httpx.Response(200, json=INCEPTION)]
    )

    assert (await api.get("/api/v1/acclaim/tt1375666")).json()["awards"] is None
    assert (await api.get("/api/v1/acclaim/tt1375666")).json()["awards"].startswith("Won 4")
    assert route.call_count == 2


@respx.mock
async def test_without_a_key_nothing_is_requested(settings):
    from app.clients.omdb import OMDbClient

    route = respx.get(OMDB).mock(return_value=httpx.Response(200, json=INCEPTION))
    client = OMDbClient(settings.model_copy(update={"omdb_api_key": None}))

    assert await client.title("tt1375666") is None
    assert not route.called
    await client.aclose()


async def test_malformed_imdb_id_is_422(api):
    assert (await api.get("/api/v1/acclaim/1375666")).status_code == 422


@respx.mock
async def test_tv_detail_exposes_the_imdb_id_from_external_ids(api):
    respx.get(f"{TMDB}/tv/1396").mock(
        return_value=httpx.Response(
            200,
            json={"id": 1396, "name": "Breaking Bad", "external_ids": {"imdb_id": "tt0903747"}},
        )
    )

    assert (await api.get("/api/v1/tv/1396")).json()["imdb_id"] == "tt0903747"
