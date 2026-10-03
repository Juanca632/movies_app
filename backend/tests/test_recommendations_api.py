from types import SimpleNamespace

import pytest
import respx

from app.clients.tmdb import TMDBNotFoundError, TMDBUnavailableError
from app.core.cache import TTLStore
from app.schemas.me import SavedTitle
from app.services import recommendations
from app.services.media import to_summary
from app.services.recommendations import for_you
from tests.accounts import ORIGIN, sign_in

BASE = "https://tmdb.test/3"
SAME_SITE = {"Origin": ORIGIN}


def movie(movie_id: int, recommended: list[int] = ()) -> dict:
    return {
        "id": movie_id,
        "title": f"Movie {movie_id}",
        "recommendations": {"results": [{"id": i, "title": f"Movie {i}"} for i in recommended]},
    }


# Two favourites and a planned one; 11 is recommended by all three, 3 is already a favourite.
CATALOGUE = {
    1: movie(1, [10, 11, 12, 13, 3]),
    3: movie(3, [11, 14, 15, 16, 17]),
    5: movie(5, [12, 11]),
}


@pytest.fixture(autouse=True)
def empty_cache(monkeypatch):
    monkeypatch.setattr(recommendations, "_cache", TTLStore(16))


@pytest.fixture
async def signed_in(site):
    await sign_in(site)
    return site


@pytest.fixture
def tmdb_movies():
    with respx.mock:
        for movie_id, raw in CATALOGUE.items():
            respx.get(f"{BASE}/movie/{movie_id}").respond(json=raw)
        respx.get(url__startswith=BASE).respond(404, json={"status_code": 34})
        yield


async def test_recommendations_need_a_signed_in_user(site):
    assert (await site.get("/api/v1/me/recommendations")).status_code == 401


async def test_empty_lists_give_no_recommendations(signed_in):
    response = await signed_in.get("/api/v1/me/recommendations")

    assert response.status_code == 200
    assert response.json() == {"picks": [], "because": []}


async def test_recommendations_rank_titles_liked_from_several_saves(signed_in, tmdb_movies):
    await signed_in.put("/api/v1/me/favorite/movie/1", headers=SAME_SITE)
    await signed_in.put("/api/v1/me/favorite/movie/3", headers=SAME_SITE)
    await signed_in.put("/api/v1/me/watchlist/movie/5", headers=SAME_SITE)

    body = (await signed_in.get("/api/v1/me/recommendations")).json()

    picks = [p["id"] for p in body["picks"]]
    assert picks[0] == 11
    assert 3 not in picks
    assert sorted(picks) == [10, 11, 12, 13, 14, 15, 16, 17]
    # One row per favourite, newest first, without saved titles.
    rows = [(row["source"]["id"], [r["id"] for r in row["results"]]) for row in body["because"]]
    assert rows == [(3, [11, 14, 15, 16, 17]), (1, [10, 11, 12, 13])]


async def test_recommendations_are_remembered_until_the_lists_change(
    signed_in, tmdb_movies, monkeypatch
):
    computed = []

    async def spy(media, favorites, watchlist):
        computed.append([t.id for t in favorites])
        return await for_you(media, favorites, watchlist)

    monkeypatch.setattr(recommendations, "for_you", spy)
    await signed_in.put("/api/v1/me/favorite/movie/1", headers=SAME_SITE)

    first = (await signed_in.get("/api/v1/me/recommendations")).json()
    again = (await signed_in.get("/api/v1/me/recommendations")).json()
    await signed_in.put("/api/v1/me/favorite/movie/3", headers=SAME_SITE)
    changed = (await signed_in.get("/api/v1/me/recommendations")).json()

    assert again == first
    assert computed == [[1], [3, 1]]
    assert [row["source"]["id"] for row in changed["because"]] == [3, 1]


def saved(movie_id: int) -> SavedTitle:
    return SavedTitle(
        id=movie_id, media_type="movie", title=f"Movie {movie_id}", saved_at="2026-10-01T00:00:00Z"
    )


class FakeMedia:
    """Details from CATALOGUE; any other id fails like TMDB would."""

    def __init__(self, error: Exception | None = None) -> None:
        self._error = error or TMDBNotFoundError("gone")

    async def detail(self, media_type, media_id, region):
        if media_id not in CATALOGUE:
            raise self._error
        results = CATALOGUE[media_id]["recommendations"]["results"]
        return SimpleNamespace(recommendations=[to_summary(r, media_type) for r in results])


async def test_titles_gone_from_tmdb_are_skipped():
    result = await for_you(FakeMedia(), [saved(404), saved(1)], [])

    assert [p.id for p in result.picks] == [10, 11, 12, 13, 3]
    assert [row.source.id for row in result.because] == [1]


async def test_short_rows_are_left_out():
    # Movie 5 has only two recommendations: enough for the picks, too few for a row.
    result = await for_you(FakeMedia(), [saved(5)], [])

    assert [p.id for p in result.picks] == [12, 11]
    assert result.because == []


async def test_fails_when_no_saved_title_can_be_read():
    with pytest.raises(TMDBUnavailableError):
        await for_you(FakeMedia(TMDBUnavailableError("down")), [saved(404)], [saved(405)])
