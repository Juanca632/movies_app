from datetime import datetime
from typing import Literal

from pydantic import BaseModel

from app.schemas.media import MediaType

ListKind = Literal["favorite", "watchlist"]


class Profile(BaseModel):
    name: str
    email: str
    avatar_url: str | None = None


class SavedTitle(BaseModel):
    """A title in one of the user's lists, as it was when saved."""

    id: int
    media_type: MediaType
    title: str
    poster_path: str | None = None
    release_date: str | None = None
    saved_at: datetime
