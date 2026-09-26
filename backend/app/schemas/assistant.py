from typing import Annotated, Literal

from pydantic import BaseModel, Field, StringConstraints

from app.schemas.media import MediaSummary, MediaType, Provider

# A question as typed; the endpoint also collapses inner runs of whitespace.
Question = Annotated[str, StringConstraints(strip_whitespace=True, min_length=3, max_length=300)]
MAX_HISTORY = 5


class PickRef(BaseModel):
    media_type: MediaType
    id: int
    title: Annotated[str, StringConstraints(max_length=200)]


class Turn(BaseModel):
    """An earlier question in the conversation and what was recommended, in short."""

    question: Question
    picks: Annotated[list[PickRef], Field(max_length=8)] = []


class AskRequest(BaseModel):
    question: Question
    region: Annotated[str, StringConstraints(pattern="^[A-Z]{2}$")] = "US"
    # The model has no memory: follow-ups ("more recent ones") need the earlier turns resent.
    history: Annotated[list[Turn], Field(max_length=MAX_HISTORY)] = []


class Pick(BaseModel):
    """A title the assistant recommends, with why and where to stream it."""

    item: MediaSummary
    reason: str
    providers: list[Provider] = []


class Answer(BaseModel):
    type: Literal["answer"] = "answer"
    intro: str
    picks: list[Pick] = []


class Status(BaseModel):
    """What the assistant is doing right now, e.g. "Searching comedies on Netflix"."""

    type: Literal["status"] = "status"
    text: str


class Failure(BaseModel):
    type: Literal["error"] = "error"
    message: str


AssistantEvent = Status | Answer | Failure
