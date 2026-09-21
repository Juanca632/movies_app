import httpx
import respx

BASE = "https://tmdb.test/3"


@respx.mock
async def test_trending_people(api):
    respx.get(f"{BASE}/trending/person/week").mock(
        return_value=httpx.Response(
            200,
            json={
                "page": 1,
                "total_pages": 2,
                "results": [{"id": 1, "name": "Ana", "profile_path": "/a.jpg", "popularity": 9}],
            },
        )
    )

    body = (await api.get("/api/v1/person/trending")).json()

    assert body["results"][0]["name"] == "Ana"
    assert body["results"][0]["media_type"] == "person"


@respx.mock
async def test_person_detail_dedupes_and_sorts_credits(api):
    route = respx.get(f"{BASE}/person/5").mock(
        return_value=httpx.Response(
            200,
            json={
                "id": 5,
                "name": "Bob",
                "biography": "bio",
                "movie_credits": {
                    "cast": [
                        {"id": 10, "title": "Low", "popularity": 1},
                        {"id": 11, "title": "High", "popularity": 50},
                        {"id": 11, "title": "High", "popularity": 50},
                    ]
                },
                "tv_credits": {"cast": [{"id": 20, "name": "Show", "popularity": 5}]},
            },
        )
    )

    body = (await api.get("/api/v1/person/5")).json()

    assert [m["title"] for m in body["movies"]] == ["High", "Low"]
    assert body["tv_shows"][0]["media_type"] == "tv"
    assert body["biography"] == "bio"
    assert route.call_count == 1


@respx.mock
async def test_person_not_found(api):
    respx.get(f"{BASE}/person/404").mock(return_value=httpx.Response(404))

    assert (await api.get("/api/v1/person/404")).status_code == 404


@respx.mock
async def test_search_mixes_media_and_people(api):
    route = respx.get(f"{BASE}/search/multi").mock(
        return_value=httpx.Response(
            200,
            json={
                "page": 1,
                "total_pages": 1,
                "total_results": 3,
                "results": [
                    {"id": 1, "media_type": "movie", "title": "Batman"},
                    {"id": 2, "media_type": "tv", "name": "Batman TV"},
                    {"id": 3, "media_type": "person", "name": "Bat Person"},
                ],
            },
        )
    )

    response = await api.get("/api/v1/search", params={"q": " batman "})

    assert response.status_code == 200
    results = response.json()["results"]
    assert [(r["media_type"], r.get("title") or r["name"]) for r in results] == [
        ("movie", "Batman"),
        ("tv", "Batman TV"),
        ("person", "Bat Person"),
    ]
    assert route.calls.last.request.url.params["query"] == "batman"


async def test_search_requires_query(api):
    assert (await api.get("/api/v1/search")).status_code == 422
    assert (await api.get("/api/v1/search", params={"q": ""})).status_code == 422
