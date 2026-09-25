import httpx
import respx

BASE = "https://tmdb.test/3"

MOVIE_ITEM = {
    "id": 1,
    "title": "Movie One",
    "overview": "o",
    "poster_path": "/p.jpg",
    "backdrop_path": "/b.jpg",
    "release_date": "2024-01-01",
    "vote_average": 7.5,
    "vote_count": 10,
    "genre_ids": [28],
}
TV_ITEM = {"id": 2, "name": "Show Two", "first_air_date": "2023-05-05", "vote_average": 8}


@respx.mock
async def test_list_movies_normalises_fields(api):
    respx.get(f"{BASE}/movie/popular").mock(
        return_value=httpx.Response(
            200, json={"page": 1, "total_pages": 3, "total_results": 60, "results": [MOVIE_ITEM]}
        )
    )

    response = await api.get("/api/v1/movie")

    assert response.status_code == 200
    body = response.json()
    assert body["total_pages"] == 3
    assert body["results"][0]["title"] == "Movie One"
    assert body["results"][0]["media_type"] == "movie"


@respx.mock
async def test_list_tv_maps_name_and_first_air_date(api):
    respx.get(f"{BASE}/tv/top_rated").mock(
        return_value=httpx.Response(200, json={"page": 1, "results": [TV_ITEM]})
    )

    response = await api.get("/api/v1/tv", params={"category": "top_rated"})

    item = response.json()["results"][0]
    assert item["title"] == "Show Two"
    assert item["release_date"] == "2023-05-05"
    assert item["media_type"] == "tv"


async def test_category_not_valid_for_media_type_is_422(api):
    response = await api.get("/api/v1/tv", params={"category": "upcoming"})

    assert response.status_code == 422


async def test_unknown_media_type_is_422(api):
    assert (await api.get("/api/v1/book")).status_code == 422


@respx.mock
async def test_upcoming_excludes_movies_now_playing(api):
    respx.get(f"{BASE}/movie/upcoming").mock(
        return_value=httpx.Response(
            200, json={"results": [MOVIE_ITEM, {**MOVIE_ITEM, "id": 9, "title": "Soon"}]}
        )
    )
    respx.get(f"{BASE}/movie/now_playing").mock(
        return_value=httpx.Response(200, json={"results": [MOVIE_ITEM]})
    )

    response = await api.get("/api/v1/movie", params={"category": "upcoming"})

    assert [m["id"] for m in response.json()["results"]] == [9]


@respx.mock
async def test_movie_detail_aggregates_everything_in_one_tmdb_call(api):
    route = respx.get(f"{BASE}/movie/1").mock(
        return_value=httpx.Response(
            200,
            json={
                **MOVIE_ITEM,
                "tagline": "tag",
                "runtime": 120,
                "genres": [{"id": 28, "name": "Action"}],
                "credits": {"cast": [{"id": 5, "name": "Actor", "character": "Hero"}]},
                "images": {
                    "backdrops": [{"file_path": "/x.jpg", "width": 10, "height": 5}],
                    "posters": [],
                },
                "watch/providers": {
                    "results": {
                        "US": {
                            "link": "http://w",
                            "flatrate": [{"provider_id": 8, "provider_name": "Netflix"}],
                        }
                    }
                },
                "recommendations": {"results": [{**MOVIE_ITEM, "id": 3, "title": "Rec"}]},
            },
        )
    )

    response = await api.get("/api/v1/movie/1")

    assert response.status_code == 200
    body = response.json()
    assert body["runtime"] == 120
    assert body["genres"] == [{"id": 28, "name": "Action"}]
    assert body["cast"][0]["character"] == "Hero"
    assert body["images"]["backdrops"][0]["file_path"] == "/x.jpg"
    assert body["providers"]["flatrate"][0]["provider_name"] == "Netflix"
    assert body["recommendations"][0]["title"] == "Rec"
    assert route.call_count == 1
    assert "credits" in route.calls.last.request.url.params["append_to_response"]


@respx.mock
async def test_tv_detail_uses_aggregate_credits_and_episode_runtime(api):
    route = respx.get(f"{BASE}/tv/2").mock(
        return_value=httpx.Response(
            200,
            json={
                **TV_ITEM,
                "episode_run_time": [45],
                "number_of_seasons": 3,
                "aggregate_credits": {
                    "cast": [{"id": 7, "name": "Star", "roles": [{"character": "Lead"}]}]
                },
                "watch/providers": {"results": {}},
            },
        )
    )

    body = (await api.get("/api/v1/tv/2")).json()

    assert body["runtime"] == 45
    assert body["number_of_seasons"] == 3
    assert body["cast"][0]["character"] == "Lead"
    assert body["providers"] is None
    assert "aggregate_credits" in route.calls.last.request.url.params["append_to_response"]


@respx.mock
async def test_detail_uses_requested_region(api):
    respx.get(f"{BASE}/movie/1").mock(
        return_value=httpx.Response(
            200,
            json={**MOVIE_ITEM, "watch/providers": {"results": {"FR": {"link": "fr"}}}},
        )
    )

    body = (await api.get("/api/v1/movie/1", params={"region": "FR"})).json()

    assert body["providers"]["region"] == "FR"


@respx.mock
async def test_tmdb_404_becomes_404(api):
    respx.get(f"{BASE}/movie/999").mock(return_value=httpx.Response(404))

    assert (await api.get("/api/v1/movie/999")).status_code == 404


@respx.mock
async def test_tmdb_down_becomes_502(api):
    respx.get(f"{BASE}/movie/1").mock(return_value=httpx.Response(500))

    assert (await api.get("/api/v1/movie/1")).status_code == 502


async def test_health(api):
    assert (await api.get("/health")).json() == {"status": "ok"}


def video(
    key: str, kind: str, *, official: bool = True, published: str = "2020-01-01", site="YouTube"
):
    return {
        "key": key,
        "name": key,
        "site": site,
        "type": kind,
        "official": official,
        "published_at": published,
    }


@respx.mock
async def test_detail_picks_the_best_youtube_trailer(api):
    videos = [
        video("clip", "Clip"),
        video("vimeo", "Trailer", site="Vimeo"),
        video("teaser", "Teaser", published="2024-01-01"),
        video("fan", "Trailer", official=False, published="2024-06-01"),
        video("old", "Trailer", published="2019-01-01"),
        video("new", "Trailer", published="2021-01-01"),
    ]
    respx.get(f"{BASE}/movie/1").mock(
        return_value=httpx.Response(200, json={**MOVIE_ITEM, "videos": {"results": videos}})
    )

    response = await api.get("/api/v1/movie/1")

    assert response.json()["trailer"] == {"key": "new", "name": "new"}


@respx.mock
async def test_detail_without_trailers_has_none(api):
    respx.get(f"{BASE}/tv/2").mock(
        return_value=httpx.Response(
            200, json={**TV_ITEM, "videos": {"results": [video("clip", "Clip")]}}
        )
    )

    response = await api.get("/api/v1/tv/2")

    assert response.json()["trailer"] is None


@respx.mock
async def test_detail_credits_movie_directors_and_tv_creators(api):
    respx.get(f"{BASE}/movie/1").mock(
        return_value=httpx.Response(
            200,
            json={
                **MOVIE_ITEM,
                "credits": {
                    "crew": [
                        {"id": 525, "name": "Christopher Nolan", "job": "Director"},
                        {"id": 9, "name": "Assistant", "job": "First Assistant Director"},
                        {"id": 525, "name": "Christopher Nolan", "job": "Writer"},
                    ]
                },
            },
        )
    )
    respx.get(f"{BASE}/tv/2").mock(
        return_value=httpx.Response(
            200, json={**TV_ITEM, "created_by": [{"id": 66633, "name": "Vince Gilligan"}]}
        )
    )

    movie = (await api.get("/api/v1/movie/1")).json()
    tv = (await api.get("/api/v1/tv/2")).json()

    assert movie["creators"] == [{"id": 525, "name": "Christopher Nolan"}]
    assert tv["creators"] == [{"id": 66633, "name": "Vince Gilligan"}]


@respx.mock
async def test_movie_detail_links_its_collection(api):
    respx.get(f"{BASE}/movie/673").mock(
        return_value=httpx.Response(
            200,
            json={
                **MOVIE_ITEM,
                "id": 673,
                "belongs_to_collection": {
                    "id": 1241,
                    "name": "Harry Potter Collection",
                    "poster_path": "/hp.jpg",
                    "backdrop_path": "/hpb.jpg",
                },
            },
        )
    )
    respx.get(f"{BASE}/movie/1").mock(return_value=httpx.Response(200, json=MOVIE_ITEM))

    saga = (await api.get("/api/v1/movie/673")).json()
    standalone = (await api.get("/api/v1/movie/1")).json()

    assert saga["collection"]["id"] == 1241
    assert saga["collection"]["name"] == "Harry Potter Collection"
    assert standalone["collection"] is None


@respx.mock
async def test_collection_lists_parts_in_release_order(api):
    respx.get(f"{BASE}/collection/1241").mock(
        return_value=httpx.Response(
            200,
            json={
                "id": 1241,
                "name": "Harry Potter Collection",
                "overview": "Wizards.",
                "parts": [
                    {"id": 674, "title": "Goblet of Fire", "release_date": "2005-11-16"},
                    {"id": 999, "title": "Unannounced", "release_date": ""},
                    {"id": 671, "title": "Philosopher's Stone", "release_date": "2001-11-16"},
                    {"id": 673, "title": "Prisoner of Azkaban", "release_date": "2004-05-31"},
                ],
            },
        )
    )

    response = await api.get("/api/v1/collection/1241")

    assert response.status_code == 200
    body = response.json()
    assert body["name"] == "Harry Potter Collection"
    assert [part["title"] for part in body["parts"]] == [
        "Philosopher's Stone",
        "Prisoner of Azkaban",
        "Goblet of Fire",
        "Unannounced",
    ]
    assert body["parts"][0]["media_type"] == "movie"


@respx.mock
async def test_unknown_collection_is_404(api):
    respx.get(f"{BASE}/collection/404").mock(return_value=httpx.Response(404))

    assert (await api.get("/api/v1/collection/404")).status_code == 404
