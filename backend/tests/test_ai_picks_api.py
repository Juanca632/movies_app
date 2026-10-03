# Shares the fake Claude and its fixtures with test_assistant_api, imported below.
# ruff: noqa: F401, F811

from datetime import UTC, datetime, timedelta

import anthropic
import httpx
import pytest
from sqlalchemy import update

from app.db.models import AiPicks
from tests.test_assistant_api import (
    DISCOVER_COMEDIES,
    PRESENT_MOVIE_ONE,
    claude,
    reply,
    save,
    settings,
    signed_in_ask,
    tmdb_routes,
)

PICKS = "/api/v1/me/ai-picks?region=ES"


@pytest.fixture
def picking(claude):
    """Claude finds Movie One and picks it, as many times as asked."""
    claude.replies = [reply(DISCOVER_COMEDIES), reply(PRESENT_MOVIE_ONE)] * 3
    return claude


async def test_ai_picks_need_a_signed_in_user(site):
    assert (await site.get(PICKS)).status_code == 401


async def test_nothing_saved_means_no_picks_and_no_tokens(signed_in_ask, picking, tmdb_routes):
    response = await signed_in_ask.get(PICKS)

    assert response.status_code == 200
    assert response.json() is None
    assert picking.requests == []


async def test_picks_are_made_once_and_reused(signed_in_ask, picking, tmdb_routes):
    await save(signed_in_ask, "favorite", {"id": 7, "title": "Alien"})

    first = (await signed_in_ask.get(PICKS)).json()
    again = (await signed_in_ask.get(PICKS)).json()

    assert [p["item"]["title"] for p in first["picks"]] == ["Movie One"]
    assert again == first
    assert len(picking.requests) == 2  # one answer: a search, then the picks
    prompt = picking.requests[0]["messages"][0]["content"]
    assert "- Favorites: Alien (movie 7)" in prompt


async def test_changed_lists_get_new_picks_once_a_day(
    signed_in_ask, picking, tmdb_routes, db_sessionmaker
):
    await save(signed_in_ask, "favorite", {"id": 7, "title": "Alien"})
    await signed_in_ask.get(PICKS)

    # Saving a pick: it is left out at once, but no new answer is paid for the same day.
    await save(signed_in_ask, "watchlist", {"id": 1, "title": "Movie One"})
    assert (await signed_in_ask.get(PICKS)).json()["picks"] == []
    assert len(picking.requests) == 2

    async with db_sessionmaker() as db:
        yesterday = datetime.now(UTC) - timedelta(days=1, minutes=1)
        await db.execute(update(AiPicks).values(generated_at=yesterday))
        await db.commit()
    await signed_in_ask.get(PICKS)
    assert len(picking.requests) == 4


async def test_failures_keep_nothing_and_show_nothing(
    signed_in_ask, claude, tmdb_routes, db_sessionmaker
):
    await save(signed_in_ask, "favorite", {"id": 7, "title": "Alien"})
    request = httpx.Request("POST", "https://api.anthropic.com/v1/messages")
    claude.replies = [anthropic.APIConnectionError(request=request)]

    assert (await signed_in_ask.get(PICKS)).json() is None

    async with db_sessionmaker() as db:
        assert await db.get(AiPicks, 1) is None


async def test_no_picks_without_the_assistant(signed_in_ask, tmdb_routes):
    from app.api.deps import get_assistant

    signed_in_ask.app.dependency_overrides[get_assistant] = lambda: None
    await save(signed_in_ask, "favorite", {"id": 7, "title": "Alien"})

    assert (await signed_in_ask.get(PICKS)).json() is None
