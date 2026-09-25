import asyncio
from collections.abc import Callable
from typing import Any

from app.clients.tmdb import TMDBClient
from app.core.config import Settings
from app.schemas.media import MediaSummary, MediaType, Page
from app.schemas.people import PersonDetail, PersonSummary, SearchResult
from app.services.media import to_summary

MAX_CREDITS = 40
MAX_KNOWN_FOR = 3

# TMDB's popular/trending people are polluted with performers from erotic productions that
# are not flagged as adult. Requiring a photo and one widely rated title keeps "stars" to
# people most visitors would recognise.
STAR_MIN_VOTES = 500
STAR_PAGES = (1, 2)
MAX_STARS = 20


def to_person(raw: dict[str, Any]) -> PersonSummary:
    known_for = sorted(
        raw.get("known_for") or [], key=lambda item: item.get("vote_count") or 0, reverse=True
    )
    return PersonSummary(
        id=raw["id"],
        name=raw.get("name") or "",
        profile_path=raw.get("profile_path"),
        known_for_department=raw.get("known_for_department"),
        known_for=[
            title
            for item in known_for[:MAX_KNOWN_FOR]
            if (title := item.get("title") or item.get("name"))
        ],
        popularity=raw.get("popularity") or 0,
    )


def _is_star(raw: dict[str, Any]) -> bool:
    votes = (item.get("vote_count") or 0 for item in raw.get("known_for") or [])
    return (
        not raw.get("adult")
        and bool(raw.get("profile_path"))
        and max(votes, default=0) >= STAR_MIN_VOTES
    )


def _credits(items: list[tuple[dict[str, Any], MediaType]]) -> list[MediaSummary]:
    """Most popular first, each title once (a person can have several roles in it)."""
    seen: set[tuple[MediaType, int]] = set()
    credits = []
    for item, media_type in sorted(items, key=lambda i: i[0].get("popularity") or 0, reverse=True):
        if (media_type, item["id"]) not in seen:
            seen.add((media_type, item["id"]))
            credits.append(to_summary(item, media_type))
    return credits[:MAX_CREDITS]


def _crew(raw: dict[str, Any], matches: Callable[[dict[str, Any]], bool]) -> list[MediaSummary]:
    """Crew credits of both movies and TV shows that match a job or department."""
    return _credits(
        [
            (item, media_type)
            for key, media_type in (("movie_credits", "movie"), ("tv_credits", "tv"))
            for item in raw.get(key, {}).get("crew", [])
            if matches(item)
        ]
    )


class PeopleService:
    def __init__(self, tmdb: TMDBClient, settings: Settings) -> None:
        self._tmdb = tmdb
        self._settings = settings

    async def popular(self) -> list[PersonSummary]:
        """Well-known people right now (see STAR_MIN_VOTES for why this is filtered)."""
        pages = await asyncio.gather(
            *(
                self._tmdb.get(
                    "/person/popular", {"page": page}, ttl=self._settings.cache_ttl_lists
                )
                for page in STAR_PAGES
            )
        )
        seen: set[int] = set()
        stars = []
        for raw in (item for page in pages for item in page.get("results", [])):
            if raw["id"] not in seen and _is_star(raw):
                seen.add(raw["id"])
                stars.append(to_person(raw))
        return stars[:MAX_STARS]

    async def detail(self, person_id: int) -> PersonDetail:
        raw = await self._tmdb.get(
            f"/person/{person_id}",
            {"append_to_response": "movie_credits,tv_credits"},
            ttl=self._settings.cache_ttl_details,
        )
        directed = _crew(raw, lambda item: item.get("job") == "Director")
        created = _crew(raw, lambda item: item.get("job") == "Creator")
        written = _crew(raw, lambda item: item.get("department") == "Writing")
        # Writer-directors write most of what they direct; "Written" lists the rest.
        made = {(item.media_type, item.id) for item in directed + created}
        return PersonDetail(
            **to_person(raw).model_dump(),
            biography=raw.get("biography") or "",
            birthday=raw.get("birthday"),
            deathday=raw.get("deathday"),
            place_of_birth=raw.get("place_of_birth"),
            also_known_as=raw.get("also_known_as", []),
            movies=_credits(
                [(item, "movie") for item in raw.get("movie_credits", {}).get("cast", [])]
            ),
            tv_shows=_credits([(item, "tv") for item in raw.get("tv_credits", {}).get("cast", [])]),
            directed=directed,
            created=created,
            written=[item for item in written if (item.media_type, item.id) not in made],
        )

    async def search(self, query: str, page: int) -> Page[SearchResult]:
        raw = await self._tmdb.get(
            "/search/multi",
            {"query": query, "page": page, "include_adult": "false"},
            ttl=self._settings.cache_ttl_lists,
        )
        results: list[MediaSummary | PersonSummary] = []
        for item in raw.get("results", []):
            kind = item.get("media_type")
            if kind == "person":
                results.append(to_person(item))
            elif kind in ("movie", "tv"):
                results.append(to_summary(item, kind))
        return Page[SearchResult](
            page=raw.get("page", page),
            total_pages=raw.get("total_pages", 1),
            total_results=raw.get("total_results", len(results)),
            results=results,
        )
