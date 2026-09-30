from datetime import UTC, datetime

from sqlalchemy import delete, func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import models
from app.schemas.me import ListKind, SavedTitle
from app.schemas.media import MediaType
from app.services.media import MediaService

# Far above any real use, low enough that a script can't fill the database.
MAX_PER_LIST = 1000


class ListFullError(Exception):
    pass


def _saved(row: models.SavedTitle) -> SavedTitle:
    return SavedTitle(
        id=row.tmdb_id,
        media_type=row.media_type,
        title=row.title,
        poster_path=row.poster_path,
        release_date=row.release_date,
        # SQLite hands back naive datetimes; Postgres keeps the zone. Both are UTC.
        saved_at=row.created_at.replace(tzinfo=row.created_at.tzinfo or UTC),
    )


class ListsService:
    """The user's favourites and watchlist."""

    def __init__(self, db: AsyncSession, media: MediaService, user_id: int) -> None:
        self._db = db
        self._media = media
        self._user_id = user_id

    def _key(self, kind: ListKind, media_type: MediaType, tmdb_id: int) -> tuple:
        return (self._user_id, kind, media_type, tmdb_id)

    async def titles(self, kind: ListKind) -> list[SavedTitle]:
        rows = await self._db.scalars(
            select(models.SavedTitle)
            .where(models.SavedTitle.user_id == self._user_id, models.SavedTitle.kind == kind)
            .order_by(models.SavedTitle.created_at.desc(), models.SavedTitle.tmdb_id.desc())
        )
        return [_saved(row) for row in rows]

    async def add(self, kind: ListKind, media_type: MediaType, tmdb_id: int) -> SavedTitle:
        """Save a title; saving one that is already there changes nothing."""
        key = self._key(kind, media_type, tmdb_id)
        existing = await self._db.get(models.SavedTitle, key)
        if existing is not None:
            return _saved(existing)

        size = await self._db.scalar(
            select(func.count())
            .select_from(models.SavedTitle)
            .where(models.SavedTitle.user_id == self._user_id, models.SavedTitle.kind == kind)
        )
        if size >= MAX_PER_LIST:
            raise ListFullError
        # Usually cached: the user is looking at this title. Unknown ids raise TMDBNotFoundError.
        detail = await self._media.detail(media_type, tmdb_id, "US")
        row = models.SavedTitle(
            user_id=self._user_id,
            kind=kind,
            media_type=media_type,
            tmdb_id=tmdb_id,
            title=detail.title,
            poster_path=detail.poster_path,
            release_date=detail.release_date,
            # Set here, not by the database: SQLite's clock has whole seconds, too coarse to
            # order titles saved in a row.
            created_at=datetime.now(UTC),
        )
        self._db.add(row)
        try:
            await self._db.commit()
        except IntegrityError:
            # Saved at the same moment from another tab: that one wins.
            await self._db.rollback()
            return _saved(await self._db.get(models.SavedTitle, key))
        return _saved(row)

    async def remove(self, kind: ListKind, media_type: MediaType, tmdb_id: int) -> None:
        await self._db.execute(
            delete(models.SavedTitle).where(
                models.SavedTitle.user_id == self._user_id,
                models.SavedTitle.kind == kind,
                models.SavedTitle.media_type == media_type,
                models.SavedTitle.tmdb_id == tmdb_id,
            )
        )
        await self._db.commit()
