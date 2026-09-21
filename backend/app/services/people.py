from typing import Any

from app.clients.tmdb import TMDBClient
from app.core.config import Settings
from app.schemas.media import MediaSummary, MediaType, Page
from app.schemas.people import PersonDetail, PersonSummary, SearchResult
from app.services.media import to_summary

MAX_CREDITS = 40


def to_person(raw: dict[str, Any]) -> PersonSummary:
    return PersonSummary(
        id=raw["id"],
        name=raw.get("name") or "",
        profile_path=raw.get("profile_path"),
        known_for_department=raw.get("known_for_department"),
        popularity=raw.get("popularity") or 0,
    )


def _credits(items: list[dict[str, Any]], media_type: MediaType) -> list[MediaSummary]:
    """Most popular first, each title once (an actor can have several roles in it)."""
    seen: set[int] = set()
    credits = []
    for item in sorted(items, key=lambda i: i.get("popularity") or 0, reverse=True):
        if item["id"] not in seen:
            seen.add(item["id"])
            credits.append(to_summary(item, media_type))
    return credits[:MAX_CREDITS]


class PeopleService:
    def __init__(self, tmdb: TMDBClient, settings: Settings) -> None:
        self._tmdb = tmdb
        self._settings = settings

    async def trending(self, page: int) -> Page[PersonSummary]:
        raw = await self._tmdb.get(
            "/trending/person/week", {"page": page}, ttl=self._settings.cache_ttl_lists
        )
        return Page[PersonSummary](
            page=raw.get("page", page),
            total_pages=raw.get("total_pages", 1),
            total_results=raw.get("total_results", 0),
            results=[to_person(item) for item in raw.get("results", [])],
        )

    async def detail(self, person_id: int) -> PersonDetail:
        raw = await self._tmdb.get(
            f"/person/{person_id}",
            {"append_to_response": "movie_credits,tv_credits"},
            ttl=self._settings.cache_ttl_details,
        )
        return PersonDetail(
            **to_person(raw).model_dump(),
            biography=raw.get("biography") or "",
            birthday=raw.get("birthday"),
            deathday=raw.get("deathday"),
            place_of_birth=raw.get("place_of_birth"),
            also_known_as=raw.get("also_known_as", []),
            movies=_credits(raw.get("movie_credits", {}).get("cast", []), "movie"),
            tv_shows=_credits(raw.get("tv_credits", {}).get("cast", []), "tv"),
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
