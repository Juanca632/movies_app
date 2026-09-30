import pytest
import respx
from sqlalchemy import func, select

from app.db.models import SavedTitle, User, UserSession
from app.services import lists
from tests.accounts import ORIGIN, sign_in

BASE = "https://tmdb.test/3"
SAME_SITE = {"Origin": ORIGIN}

ALIEN = {"id": 1, "title": "Alien", "poster_path": "/alien.jpg", "release_date": "1979-05-25"}
DARK = {"id": 2, "name": "Dark", "poster_path": "/dark.jpg", "first_air_date": "2017-12-01"}


@pytest.fixture
async def signed_in(site):
    await sign_in(site)
    return site


@pytest.fixture
def tmdb_titles():
    with respx.mock:
        routes = {
            "movie": respx.get(f"{BASE}/movie/1").respond(json=ALIEN),
            "tv": respx.get(f"{BASE}/tv/2").respond(json=DARK),
        }
        respx.get(url__startswith=BASE).respond(404, json={"status_code": 34})
        yield routes


async def test_lists_need_a_signed_in_user(site):
    assert (await site.get("/api/v1/me/favorite")).status_code == 401
    response = await site.put("/api/v1/me/favorite/movie/1", headers=SAME_SITE)
    assert response.status_code == 401


async def test_saving_a_title_keeps_a_snapshot(signed_in, tmdb_titles):
    response = await signed_in.put("/api/v1/me/watchlist/tv/2", headers=SAME_SITE)

    assert response.status_code == 200
    saved = response.json()
    assert {k: saved[k] for k in ("id", "media_type", "title", "poster_path", "release_date")} == {
        "id": 2,
        "media_type": "tv",
        "title": "Dark",
        "poster_path": "/dark.jpg",
        "release_date": "2017-12-01",
    }
    listed = (await signed_in.get("/api/v1/me/watchlist")).json()
    assert [(t["media_type"], t["id"]) for t in listed] == [("tv", 2)]
    assert (await signed_in.get("/api/v1/me/favorite")).json() == []


async def test_saving_twice_is_harmless_and_skips_tmdb(signed_in, tmdb_titles):
    await signed_in.put("/api/v1/me/favorite/movie/1", headers=SAME_SITE)
    again = await signed_in.put("/api/v1/me/favorite/movie/1", headers=SAME_SITE)

    assert again.status_code == 200
    assert tmdb_titles["movie"].call_count == 1
    assert len((await signed_in.get("/api/v1/me/favorite")).json()) == 1


async def test_lists_show_the_latest_first(signed_in, tmdb_titles):
    await signed_in.put("/api/v1/me/favorite/tv/2", headers=SAME_SITE)
    await signed_in.put("/api/v1/me/favorite/movie/1", headers=SAME_SITE)

    listed = (await signed_in.get("/api/v1/me/favorite")).json()
    assert [t["id"] for t in listed] == [1, 2]


async def test_removing_a_title(signed_in, tmdb_titles):
    await signed_in.put("/api/v1/me/favorite/movie/1", headers=SAME_SITE)
    await signed_in.put("/api/v1/me/watchlist/movie/1", headers=SAME_SITE)

    response = await signed_in.delete("/api/v1/me/favorite/movie/1", headers=SAME_SITE)

    assert response.status_code == 204
    assert (await signed_in.get("/api/v1/me/favorite")).json() == []
    assert len((await signed_in.get("/api/v1/me/watchlist")).json()) == 1
    # Removing what is not there is fine too.
    again = await signed_in.delete("/api/v1/me/favorite/movie/1", headers=SAME_SITE)
    assert again.status_code == 204


async def test_each_user_sees_only_their_lists(signed_in, tmdb_titles):
    await signed_in.put("/api/v1/me/favorite/movie/1", headers=SAME_SITE)
    signed_in.cookies.clear()
    await sign_in(signed_in, sub="google-456", email="bea@example.com")

    assert (await signed_in.get("/api/v1/me/favorite")).json() == []


async def test_unknown_titles_are_not_saved(signed_in, tmdb_titles):
    response = await signed_in.put("/api/v1/me/favorite/movie/999", headers=SAME_SITE)

    assert response.status_code == 404
    assert (await signed_in.get("/api/v1/me/favorite")).json() == []


@pytest.mark.parametrize("path", ["/api/v1/me/seen/movie/1", "/api/v1/me/favorite/person/1"])
async def test_unknown_lists_and_media_types_are_rejected(signed_in, path):
    assert (await signed_in.put(path, headers=SAME_SITE)).status_code == 422


async def test_writes_from_another_site_are_refused(signed_in, tmdb_titles):
    evil = {"Origin": "https://evil.test"}

    assert (await signed_in.put("/api/v1/me/favorite/movie/1", headers=evil)).status_code == 403
    assert (await signed_in.delete("/api/v1/me/favorite/movie/1", headers=evil)).status_code == 403
    assert not tmdb_titles["movie"].called


async def test_a_full_list_refuses_more(signed_in, tmdb_titles, monkeypatch):
    monkeypatch.setattr(lists, "MAX_PER_LIST", 1)
    await signed_in.put("/api/v1/me/favorite/movie/1", headers=SAME_SITE)

    response = await signed_in.put("/api/v1/me/favorite/tv/2", headers=SAME_SITE)

    assert response.status_code == 409


async def test_deleting_the_account_removes_everything(signed_in, tmdb_titles, db_sessionmaker):
    await signed_in.put("/api/v1/me/favorite/movie/1", headers=SAME_SITE)

    response = await signed_in.delete("/api/v1/me", headers=SAME_SITE)

    assert response.status_code == 204
    assert (await signed_in.get("/api/v1/me")).status_code == 401
    async with db_sessionmaker() as session:
        for model in (User, UserSession, SavedTitle):
            assert await session.scalar(select(func.count()).select_from(model)) == 0


async def test_deleting_the_account_from_another_site_is_refused(signed_in):
    response = await signed_in.delete("/api/v1/me", headers={"Origin": "https://evil.test"})

    assert response.status_code == 403
    assert (await signed_in.get("/api/v1/me")).status_code == 200
