"""AI picks: the assistant recommends titles from a user's lists, without being asked.

Unlike a question, nobody is waiting to pay for it, so an answer is kept in the database and
reused: a new one is only asked for when the lists (or the country) changed, and at most once
a day. In between, titles the user has saved since are just left out.
"""

import hashlib
import logging
from datetime import UTC, datetime, timedelta

import anthropic
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.clients.tmdb import TMDBError
from app.db import models
from app.schemas.assistant import Answer
from app.schemas.me import SavedTitle
from app.services.assistant import AssistantError, AssistantService, taste_from

log = logging.getLogger(__name__)

# What the assistant is asked; evals/cases.yaml has a copy (case "ai-picks").
QUESTION = (
    "Based on the titles I saved, pick 8 movies or TV shows I would love. Mix well-known "
    "titles with a few I may not have heard of."
)
REFRESH_AFTER = timedelta(days=1)


def _lists_key(favorites: list[SavedTitle], watchlist: list[SavedTitle], region: str) -> str:
    """Changes whenever a title is saved or removed, or the user's country changes."""
    parts = [region, *(f"f{t.media_type}{t.id}" for t in favorites)]
    parts += [f"w{t.media_type}{t.id}" for t in watchlist]
    return hashlib.sha256(" ".join(parts).encode()).hexdigest()


def _aware(moment: datetime) -> datetime:
    # SQLite hands back naive datetimes; Postgres keeps the zone. Both are UTC.
    return moment.replace(tzinfo=moment.tzinfo or UTC)


def _unsaved(answer: Answer, saved: set[tuple[str, int]]) -> Answer:
    picks = [p for p in answer.picks if (p.item.media_type, p.item.id) not in saved]
    return answer.model_copy(update={"picks": picks})


class AiPicksService:
    def __init__(self, db: AsyncSession, assistant: AssistantService | None, user_id: int) -> None:
        self._db = db
        self._assistant = assistant
        self._user_id = user_id

    async def picks(
        self, favorites: list[SavedTitle], watchlist: list[SavedTitle], region: str
    ) -> Answer | None:
        """The user's AI picks; None when there is nothing to pick from or no AI available."""
        taste = taste_from(favorites, watchlist)
        if taste is None:
            return None
        saved = {(t.media_type, t.id) for t in [*favorites, *watchlist]}
        key = _lists_key(favorites, watchlist, region)
        row = await self._db.get(models.AiPicks, self._user_id)
        stored = Answer.model_validate_json(row.answer) if row else None

        if row and (
            row.lists_key == key or datetime.now(UTC) - _aware(row.generated_at) < REFRESH_AFTER
        ):
            return _unsaved(stored, saved)
        if self._assistant is None or not self._assistant.allow_unasked():
            return stored and _unsaved(stored, saved)

        try:
            answer = None
            async for event in self._assistant.ask(QUESTION, region, taste=taste):
                if isinstance(event, Answer):
                    answer = event
        except (AssistantError, anthropic.APIError, TMDBError):
            # Shown again on the next load, not retried in a loop: the site's limit caps it.
            log.exception("could not pick titles for a user")
            answer = None
        if answer is None:
            return stored and _unsaved(stored, saved)

        await self._store(row, key, answer)
        return _unsaved(answer, saved)

    async def _store(self, row: models.AiPicks | None, key: str, answer: Answer) -> None:
        now = datetime.now(UTC)
        if row is None:
            row = models.AiPicks(user_id=self._user_id)
            self._db.add(row)
        row.lists_key, row.answer, row.generated_at = key, answer.model_dump_json(), now
        try:
            await self._db.commit()
        except IntegrityError:
            # Picked at the same moment from another tab: that one is kept.
            await self._db.rollback()
