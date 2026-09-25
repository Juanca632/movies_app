import httpx
import respx

BASE = "https://tmdb.test/3"


def release_dates(region: str, *releases: tuple[int, str]) -> dict:
    return {
        "results": [
            {
                "iso_3166_1": region,
                "release_dates": [
                    {"type": kind, "release_date": f"{date}T00:00:00.000Z"}
                    for kind, date in releases
                ],
            },
            {"iso_3166_1": "XX", "release_dates": [{"type": 3, "release_date": "2026-10-01"}]},
        ]
    }


@respx.mock
async def test_theater_releases_use_the_local_date_in_order(api):
    discover = respx.get(f"{BASE}/discover/movie").mock(
        return_value=httpx.Response(
            200,
            json={
                "page": 1,
                "total_pages": 1,
                "results": [
                    # Discover's release_date is the primary one, not the French one.
                    {"id": 1, "title": "Popular Late", "release_date": "2026-09-18"},
                    {"id": 2, "title": "Early", "release_date": "2026-10-20"},
                    {"id": 3, "title": "Only Digital Here", "release_date": "2026-10-02"},
                ],
            },
        )
    )
    respx.get(f"{BASE}/movie/1/release_dates").mock(
        return_value=httpx.Response(
            200, json=release_dates("FR", (1, "2026-09-05"), (3, "2026-10-21"))
        )
    )
    respx.get(f"{BASE}/movie/2/release_dates").mock(
        return_value=httpx.Response(200, json=release_dates("FR", (2, "2026-10-07")))
    )
    respx.get(f"{BASE}/movie/3/release_dates").mock(
        return_value=httpx.Response(200, json=release_dates("FR", (4, "2026-10-02")))
    )

    response = await api.get(
        "/api/v1/releases/theaters", params={"month": "2026-10", "region": "FR"}
    )

    assert response.status_code == 200
    body = response.json()
    assert [(m["title"], m["release_date"]) for m in body] == [
        ("Early", "2026-10-07"),
        ("Popular Late", "2026-10-21"),
    ]
    params = discover.calls.last.request.url.params
    assert params["region"] == "FR"
    assert params["with_release_type"] == "2|3"
    assert params["release_date.gte"] == "2026-10-01"
    assert params["release_date.lte"] == "2026-10-31"


@respx.mock
async def test_home_releases_ask_for_digital_releases_across_pages(api):
    discover = respx.get(f"{BASE}/discover/movie").mock(
        side_effect=lambda request: httpx.Response(
            200,
            json={
                "page": int(request.url.params["page"]),
                "total_pages": 10,
                "results": [{"id": int(request.url.params["page"]), "title": "M"}],
            },
        )
    )
    respx.get(url__regex=rf"{BASE}/movie/\d+/release_dates").mock(
        return_value=httpx.Response(200, json=release_dates("US", (4, "2026-02-28")))
    )

    body = (await api.get("/api/v1/releases/home", params={"month": "2026-02"})).json()

    assert len(body) == 3  # capped at three pages of discover
    assert discover.calls.last.request.url.params["with_release_type"] == "4"
    assert discover.calls.last.request.url.params["release_date.lte"] == "2026-02-28"


@respx.mock
async def test_tv_releases_are_new_series_by_premiere_date(api):
    discover = respx.get(f"{BASE}/discover/tv").mock(
        return_value=httpx.Response(
            200,
            json={
                "total_pages": 1,
                "results": [
                    {"id": 1, "name": "Later Show", "first_air_date": "2026-10-20"},
                    {"id": 2, "name": "Sooner Show", "first_air_date": "2026-10-03"},
                ],
            },
        )
    )

    body = (await api.get("/api/v1/releases/tv", params={"month": "2026-10"})).json()

    assert [(m["title"], m["media_type"]) for m in body] == [
        ("Sooner Show", "tv"),
        ("Later Show", "tv"),
    ]
    assert discover.calls.last.request.url.params["first_air_date.gte"] == "2026-10-01"


async def test_releases_validate_month_and_kind(api):
    assert (await api.get("/api/v1/releases/tv", params={"month": "2026-13"})).status_code == 422
    assert (await api.get("/api/v1/releases/tv")).status_code == 422
    assert (await api.get("/api/v1/releases/radio", params={"month": "2026-10"})).status_code == 422


@respx.mock
async def test_theater_releases_skip_re_releases_of_old_movies(api):
    respx.get(f"{BASE}/discover/movie").mock(
        return_value=httpx.Response(
            200,
            json={
                "total_pages": 1,
                "results": [
                    {"id": 1, "title": "Cars", "release_date": "2006-06-08"},
                    {"id": 2, "title": "Festival Hit", "release_date": "2025-11-01"},
                ],
            },
        )
    )
    respx.get(url__regex=rf"{BASE}/movie/\d+/release_dates").mock(
        return_value=httpx.Response(200, json=release_dates("US", (3, "2026-10-09")))
    )

    body = (await api.get("/api/v1/releases/theaters", params={"month": "2026-10"})).json()

    assert [m["title"] for m in body] == ["Festival Hit"]
