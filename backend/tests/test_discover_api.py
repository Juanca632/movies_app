import httpx
import respx

BASE = "https://tmdb.test/3"


def provider(provider_id: int, name: str, *, priority: int) -> dict:
    return {
        "provider_id": provider_id,
        "provider_name": name,
        "display_priorities": {"CO": priority},
    }


MOVIE_ITEM = {"id": 1, "title": "Movie One", "release_date": "2024-01-01", "vote_average": 7.5}


@respx.mock
async def test_genres_are_listed_per_media_type(api):
    respx.get(f"{BASE}/genre/tv/list").mock(
        return_value=httpx.Response(200, json={"genres": [{"id": 35, "name": "Comedy"}]})
    )

    response = await api.get("/api/v1/genres/tv")

    assert response.json() == [{"id": 35, "name": "Comedy"}]


@respx.mock
async def test_regions_are_sorted_by_name(api):
    respx.get(f"{BASE}/watch/providers/regions").mock(
        return_value=httpx.Response(
            200,
            json={
                "results": [
                    {"iso_3166_1": "ES", "english_name": "Spain"},
                    {"iso_3166_1": "CO", "english_name": "Colombia"},
                ]
            },
        )
    )

    response = await api.get("/api/v1/regions")

    assert response.json() == [
        {"code": "CO", "name": "Colombia"},
        {"code": "ES", "name": "Spain"},
    ]


@respx.mock
async def test_providers_follow_the_country_display_priority(api):
    route = respx.get(f"{BASE}/watch/providers/movie").mock(
        return_value=httpx.Response(
            200,
            json={
                "results": [provider(9, "Prime", priority=1), provider(8, "Netflix ", priority=0)]
            },
        )
    )

    response = await api.get("/api/v1/providers/movie", params={"region": "CO"})

    assert route.calls.last.request.url.params["watch_region"] == "CO"
    assert [(p["provider_id"], p["provider_name"]) for p in response.json()] == [
        (8, "Netflix"),
        (9, "Prime"),
    ]


async def test_providers_reject_malformed_region(api):
    assert (await api.get("/api/v1/providers/movie", params={"region": "col"})).status_code == 422


@respx.mock
async def test_discover_filters_by_genre_and_streaming_service(api):
    route = respx.get(f"{BASE}/discover/movie").mock(
        return_value=httpx.Response(
            200, json={"page": 1, "total_pages": 900, "results": [MOVIE_ITEM]}
        )
    )

    response = await api.get(
        "/api/v1/discover/movie", params={"genre": 35, "provider": 8, "region": "CO"}
    )

    params = route.calls.last.request.url.params
    assert params["with_genres"] == "35"
    assert params["with_watch_providers"] == "8"
    assert params["watch_region"] == "CO"
    assert params["with_watch_monetization_types"] == "flatrate"
    assert params["sort_by"] == "popularity.desc"
    body = response.json()
    assert body["total_pages"] == 500
    assert body["results"][0]["title"] == "Movie One"


@respx.mock
async def test_discover_newest_tv_excludes_future_air_dates(api):
    route = respx.get(f"{BASE}/discover/tv").mock(
        return_value=httpx.Response(200, json={"results": []})
    )

    await api.get("/api/v1/discover/tv", params={"sort": "newest"})

    params = route.calls.last.request.url.params
    assert params["sort_by"] == "first_air_date.desc"
    assert "first_air_date.lte" in params
    assert "with_watch_providers" not in params


async def test_discover_rejects_unknown_sort(api):
    assert (await api.get("/api/v1/discover/movie", params={"sort": "random"})).status_code == 422


@respx.mock
async def test_movie_lists_pass_the_region_through(api):
    route = respx.get(f"{BASE}/movie/now_playing").mock(
        return_value=httpx.Response(200, json={"results": [MOVIE_ITEM]})
    )

    await api.get("/api/v1/movie", params={"category": "now_playing", "region": "CO"})

    assert route.calls.last.request.url.params["region"] == "CO"
