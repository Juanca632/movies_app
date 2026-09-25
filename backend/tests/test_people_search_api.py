import httpx
import respx

BASE = "https://tmdb.test/3"


@respx.mock
async def test_popular_people_keeps_recognisable_stars_with_known_for(api):
    def person(pid: int, name: str, votes: int, **extra) -> dict:
        known_for = [
            {"id": 1, "title": "Minor", "vote_count": 10},
            {"id": 2, "name": f"{name} Show", "vote_count": votes},
        ]
        return {"id": pid, "name": name, "profile_path": "/p.jpg", "known_for": known_for, **extra}

    respx.get(f"{BASE}/person/popular", params={"page": 1}).mock(
        return_value=httpx.Response(
            200,
            json={
                "results": [
                    person(1, "Star", 9000),
                    person(2, "Obscure", 40),
                    person(3, "No Photo", 9000, profile_path=None),
                    person(4, "Adult", 9000, adult=True),
                ]
            },
        )
    )
    respx.get(f"{BASE}/person/popular", params={"page": 2}).mock(
        return_value=httpx.Response(
            200, json={"results": [person(1, "Star", 9000), person(5, "Other", 600)]}
        )
    )

    body = (await api.get("/api/v1/person/popular")).json()

    assert [p["name"] for p in body] == ["Star", "Other"]
    assert body[0]["known_for"] == ["Star Show", "Minor"]
    assert body[0]["media_type"] == "person"


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
async def test_person_detail_groups_crew_credits_across_movies_and_tv(api):
    respx.get(f"{BASE}/person/66633").mock(
        return_value=httpx.Response(
            200,
            json={
                "id": 66633,
                "name": "Vince Gilligan",
                "movie_credits": {
                    "cast": [],
                    "crew": [
                        {"id": 1, "title": "Film", "job": "Screenplay", "department": "Writing"},
                        {
                            "id": 2,
                            "title": "Produced",
                            "job": "Producer",
                            "department": "Production",
                        },
                    ],
                },
                "tv_credits": {
                    "cast": [],
                    "crew": [
                        {
                            "id": 1396,
                            "name": "Breaking Bad",
                            "popularity": 90,
                            "job": "Creator",
                            "department": "Creator",
                        },
                        {
                            "id": 1396,
                            "name": "Breaking Bad",
                            "popularity": 90,
                            "job": "Director",
                            "department": "Directing",
                        },
                        {
                            "id": 1396,
                            "name": "Breaking Bad",
                            "popularity": 90,
                            "job": "Writer",
                            "department": "Writing",
                        },
                        {
                            "id": 1,
                            "name": "Show with the film's id",
                            "job": "Writer",
                            "department": "Writing",
                        },
                    ],
                },
            },
        )
    )

    body = (await api.get("/api/v1/person/66633")).json()

    assert [m["title"] for m in body["created"]] == ["Breaking Bad"]
    assert [m["title"] for m in body["directed"]] == ["Breaking Bad"]
    # Breaking Bad is already under Created/Directed. Same id on a movie and a TV show are
    # different titles.
    assert [(m["media_type"], m["title"]) for m in body["written"]] == [
        ("movie", "Film"),
        ("tv", "Show with the film's id"),
    ]


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
