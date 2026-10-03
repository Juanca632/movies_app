from datetime import datetime

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    ForeignKey,
    Integer,
    MetaData,
    String,
    Text,
    func,
)
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    # Stable constraint names, so Alembic migrations can refer to them on any database.
    metadata = MetaData(
        naming_convention={
            "ix": "ix_%(column_0_label)s",
            "uq": "uq_%(table_name)s_%(column_0_name)s",
            "ck": "ck_%(table_name)s_%(constraint_name)s",
            "fk": "fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s",
            "pk": "pk_%(table_name)s",
        }
    )


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    # Google's stable account id; the email can change.
    google_sub: Mapped[str] = mapped_column(String(255), unique=True)
    email: Mapped[str] = mapped_column(String(320))
    name: Mapped[str] = mapped_column(String(255))
    avatar_url: Mapped[str | None] = mapped_column(String(1024))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class UserSession(Base):
    """A signed-in browser. Only the hash of the cookie's token is stored, never the token."""

    __tablename__ = "sessions"

    token_hash: Mapped[str] = mapped_column(String(64), primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class SavedTitle(Base):
    """A movie or show in one of the user's lists, with enough of it to render the list."""

    __tablename__ = "saved_titles"
    __table_args__ = (
        CheckConstraint("kind IN ('favorite', 'watchlist')", name="kind"),
        CheckConstraint("media_type IN ('movie', 'tv')", name="media_type"),
    )

    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), primary_key=True
    )
    kind: Mapped[str] = mapped_column(String(16), primary_key=True)
    media_type: Mapped[str] = mapped_column(String(8), primary_key=True)
    tmdb_id: Mapped[int] = mapped_column(Integer, primary_key=True)
    # A snapshot from when it was saved: the list renders without a TMDB call per title.
    title: Mapped[str] = mapped_column(String(512))
    poster_path: Mapped[str | None] = mapped_column(String(255))
    release_date: Mapped[str | None] = mapped_column(String(10))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class AiPicks(Base):
    """The AI's latest picks for a user, kept so a page load doesn't pay for a new answer."""

    __tablename__ = "ai_picks"

    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), primary_key=True
    )
    # A hash of the lists and country they were picked from: a change asks for new ones.
    lists_key: Mapped[str] = mapped_column(String(64))
    answer: Mapped[str] = mapped_column(Text)  # the assistant's Answer, as JSON
    generated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
