"""The rules an answer is scored against. Plain code, no model: cheap and repeatable.

TMDB changes every day (catalogs, popularity), so the rules never name the titles to expect,
only what they must be like: a horror movie, on Netflix, not older than 3 years...
"""

import re
from dataclasses import dataclass, field
from datetime import date
from typing import Any

import yaml
from pydantic import BaseModel, ConfigDict, Field

from app.schemas.assistant import Answer, Turn
from app.schemas.media import MediaType


class Expect(BaseModel):
    """What a good answer to a case looks like. Every field is optional."""

    model_config = ConfigDict(extra="forbid")  # a typo in cases.yaml must not pass silently

    picks: tuple[int, int] = (3, 5)  # how many titles, min and max
    no_picks: bool = False  # off-topic: a one-sentence reply, no titles
    media_type: MediaType | None = None
    genre: str | None = None  # every pick has it, e.g. "Horror"
    exclude_genres: list[str] = []  # no pick has them
    service: str | None = None  # every pick streams there, e.g. "Netflix"
    streaming: bool = False  # every pick streams somewhere ("for tonight")
    not_streaming_search: bool = False  # some search included titles not streaming yet
    recent_years: int | None = None  # released in the last N years
    min_rating: float | None = None  # TMDB rating of every pick
    language: str | None = None  # original language, e.g. "ko": some search asked for it
    max_runtime: int | None = None  # some search limited the runtime to at most this
    exclude_titles: list[str] = []  # e.g. the title in "something like Interstellar"
    forbid_text: list[str] = []  # must not appear in the reply (a leaked prompt...)
    reply_language: str | None = None  # "en" or "es"
    max_cost: float = 0.05  # USD for the whole question


class Case(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str
    question: str
    region: str = "US"
    history: list[Turn] = []
    expect: Expect = Field(default_factory=Expect)


def load_cases(path: str) -> list[Case]:
    with open(path, encoding="utf-8") as file:
        cases = [Case.model_validate(raw) for raw in yaml.safe_load(file)]
    ids = [case.id for case in cases]
    duplicated = {i for i in ids if ids.count(i) > 1}
    if duplicated:
        raise ValueError(f"Duplicated case ids: {', '.join(sorted(duplicated))}")
    return cases


@dataclass
class Trace:
    """What happened while answering: every tool Claude called, and what it cost."""

    tool_calls: list[tuple[str, dict[str, Any]]] = field(default_factory=list)
    turns: int = 0
    tokens_in: int = 0
    tokens_out: int = 0
    cost: float = 0.0
    seconds: float = 0.0

    def filters(self, key: str) -> list[Any]:
        """The values Claude passed as `key` to discover, e.g. every max_runtime it used."""
        return [args[key] for name, args in self.tool_calls if name == "discover" and key in args]


_WORDS = {
    "en": {"the", "and", "for", "with", "of", "to", "is", "you", "this", "these", "that", "it"},
    "es": {
        "de",
        "la",
        "el",
        "que",
        "qué",
        "para",
        "una",
        "con",
        "los",
        "las",
        "es",
        "un",
        "y",
        "por",
        "en",
        "del",
        "te",
        "se",
        "lo",
        "más",
        "solo",
        "puedo",
    },
}


def guess_language(text: str) -> str | None:
    """English or Spanish, by counting common words. Rough, but enough for a sentence or two."""
    words = re.findall(r"[a-záéíóúñü]+", text.lower())
    counts = {lang: sum(word in common for word in words) for lang, common in _WORDS.items()}
    best = max(counts, key=lambda lang: counts[lang])
    return best if counts[best] else None


def check(
    expect: Expect,
    answer: Answer | None,
    error: str | None,
    trace: Trace,
    genres: dict[int, str],
    today: date | None = None,
) -> list[str]:
    """Every rule the answer breaks, as short messages. An empty list means it passed.

    `genres` maps TMDB genre ids to names (movie and TV ones together).
    """
    if answer is None:
        return [f"no answer: {error or 'unknown error'}"]
    failures: list[str] = []
    picks = [pick.item for pick in answer.picks]
    text = " ".join([answer.intro, *(pick.reason for pick in answer.picks)])

    if expect.no_picks:
        if picks:
            failures.append(f"expected no picks, got {len(picks)}")
    else:
        low, high = expect.picks
        if not low <= len(picks) <= high:
            wanted = str(low) if low == high else f"{low}-{high}"
            failures.append(f"expected {wanted} picks, got {len(picks)}")

    for pick in answer.picks:
        item, label = pick.item, f"“{pick.item.title}”"
        names = {genres.get(g, str(g)) for g in item.genre_ids}
        if expect.media_type and item.media_type != expect.media_type:
            failures.append(f"{label} is a {item.media_type}, not a {expect.media_type}")
        if expect.genre and expect.genre not in names:
            failures.append(f"{label} is not {expect.genre} ({', '.join(sorted(names)) or '-'})")
        for genre in expect.exclude_genres:
            if genre in names:
                failures.append(f"{label} is {genre}")
        if expect.service:
            services = [p.provider_name for p in pick.providers]
            if not any(expect.service.casefold() in s.casefold() for s in services):
                failures.append(
                    f"{label} is not on {expect.service} ({', '.join(services) or '-'})"
                )
        if expect.streaming and not pick.providers:
            failures.append(f"{label} is not streaming anywhere")
        if expect.recent_years:
            oldest = (today or date.today()).year - expect.recent_years
            year = int((item.release_date or "0")[:4] or 0)
            if year < oldest:
                failures.append(f"{label} is from {year or '?'}, not after {oldest - 1}")
        if expect.min_rating is not None and item.vote_average < expect.min_rating:
            failures.append(f"{label} is rated {item.vote_average:.1f} (< {expect.min_rating})")
        for title in expect.exclude_titles:
            if item.title.casefold() == title.casefold():
                failures.append(f"recommended {label}, which it should not")

    if expect.language and expect.language not in trace.filters("original_language"):
        failures.append(f"never searched for original language {expect.language!r}")
    if expect.not_streaming_search and True not in trace.filters("include_not_streaming"):
        failures.append("never searched beyond what is streaming")
    if expect.max_runtime is not None:
        runtimes = trace.filters("max_runtime")
        if not any(runtime <= expect.max_runtime for runtime in runtimes):
            failures.append(f"never limited the runtime to {expect.max_runtime} min or less")
    for forbidden in expect.forbid_text:
        if forbidden.casefold() in text.casefold():
            failures.append(f"the reply contains {forbidden!r}")
    if expect.reply_language:
        found = guess_language(text)
        if found != expect.reply_language:
            failures.append(
                f"replied in {found or 'an unknown language'}, not {expect.reply_language}"
            )
    if trace.cost > expect.max_cost:
        failures.append(f"cost ${trace.cost:.4f} (> ${expect.max_cost})")
    return failures
