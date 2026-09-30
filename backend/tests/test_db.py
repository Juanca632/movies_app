from datetime import UTC, datetime, timedelta
from types import SimpleNamespace

import pytest
from fastapi import HTTPException
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError

from app.api.deps import get_sessionmaker
from app.db.engine import async_url
from app.db.models import SavedTitle, User, UserSession


@pytest.mark.parametrize(
    ("url", "expected"),
    [
        # Neon's URL: libpq options asyncpg rejects are dropped, TLS kept.
        (
            "postgresql://u:p@ep-x.neon.tech/db?sslmode=require&channel_binding=require",
            "postgresql+asyncpg://u:p@ep-x.neon.tech/db?ssl=require",
        ),
        ("postgres://u:p@localhost:5432/db", "postgresql+asyncpg://u:p@localhost:5432/db"),
        ("postgresql+asyncpg://u:p@localhost/db", "postgresql+asyncpg://u:p@localhost/db"),
        ("sqlite+aiosqlite:///local.db", "sqlite+aiosqlite:///local.db"),
    ],
)
def test_async_url(url, expected):
    assert async_url(url) == expected


def test_accounts_unavailable_without_a_database():
    request = SimpleNamespace(app=SimpleNamespace(state=SimpleNamespace()))
    with pytest.raises(HTTPException) as error:
        get_sessionmaker(request)
    assert error.value.status_code == 503


async def _add_user(session) -> User:
    user = User(google_sub="sub-1", email="ana@example.com", name="Ana")
    session.add(user)
    await session.flush()
    return user


async def test_deleting_a_user_deletes_their_sessions_and_lists(db_sessionmaker):
    async with db_sessionmaker() as session:
        user = await _add_user(session)
        expires = datetime.now(UTC) + timedelta(days=30)
        session.add(UserSession(token_hash="h" * 64, user_id=user.id, expires_at=expires))
        session.add(
            SavedTitle(user_id=user.id, kind="favorite", media_type="movie", tmdb_id=1, title="A")
        )
        await session.commit()

        await session.delete(user)
        await session.commit()
        for model in (UserSession, SavedTitle):
            assert await session.scalar(select(func.count()).select_from(model)) == 0


async def test_a_title_is_saved_once_per_list(db_sessionmaker):
    async with db_sessionmaker() as session:
        user = await _add_user(session)
        for kind in ("favorite", "watchlist"):
            session.add(
                SavedTitle(user_id=user.id, kind=kind, media_type="tv", tmdb_id=7, title="B")
            )
        await session.commit()

        session.add(
            SavedTitle(user_id=user.id, kind="favorite", media_type="tv", tmdb_id=7, title="B")
        )
        with pytest.raises(IntegrityError):
            await session.commit()


async def test_unknown_list_kind_is_rejected(db_sessionmaker):
    async with db_sessionmaker() as session:
        user = await _add_user(session)
        session.add(
            SavedTitle(user_id=user.id, kind="seen", media_type="movie", tmdb_id=1, title="C")
        )
        with pytest.raises(IntegrityError):
            await session.commit()
