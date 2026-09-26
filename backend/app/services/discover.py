from collections.abc import Sequence
from datetime import date
from typing import Any, Literal

from app.clients.tmdb import TMDBClient
from app.core.config import Settings
from app.schemas.media import Genre, MediaSummary, MediaType, Page, Provider, Region
from app.services.media import to_summary

Sort = Literal["popular", "top_rated", "newest"]

_DATE_FIELD = {"movie": "primary_release_date", "tv": "first_air_date"}

# Minimum votes per sort, so obscure titles with a handful of ratings don't flood the grid.
_MIN_VOTES: dict[str, int] = {"popular": 50, "top_rated": 300, "newest": 10}


def _sort_params(media_type: MediaType, sort: Sort) -> dict[str, Any]:
    params: dict[str, Any] = {"vote_count.gte": _MIN_VOTES[sort]}
    if sort == "popular":
        params["sort_by"] = "popularity.desc"
    elif sort == "top_rated":
        params["sort_by"] = "vote_average.desc"
    else:
        field = _DATE_FIELD[media_type]
        params["sort_by"] = f"{field}.desc"
        params[f"{field}.lte"] = date.today().isoformat()
    return params


class DiscoverService:
    def __init__(self, tmdb: TMDBClient, settings: Settings) -> None:
        self._tmdb = tmdb
        self._settings = settings

    async def genres(self, media_type: MediaType) -> list[Genre]:
        raw = await self._tmdb.get(f"/genre/{media_type}/list", ttl=self._settings.cache_ttl_static)
        return [Genre.model_validate(genre) for genre in raw.get("genres", [])]

    async def regions(self) -> list[Region]:
        raw = await self._tmdb.get("/watch/providers/regions", ttl=self._settings.cache_ttl_static)
        regions = [
            Region(code=item["iso_3166_1"], name=item.get("english_name") or item["iso_3166_1"])
            for item in raw.get("results", [])
        ]
        return sorted(regions, key=lambda region: region.name)

    async def providers(self, media_type: MediaType, region: str) -> list[Provider]:
        """Streaming services available in `region`, in JustWatch's order for that country."""
        raw = await self._tmdb.get(
            f"/watch/providers/{media_type}",
            {"watch_region": region},
            ttl=self._settings.cache_ttl_static,
        )

        def priority(item: dict[str, Any]) -> int:
            per_country = item.get("display_priorities") or {}
            return per_country.get(region, item.get("display_priority", 999))

        items = sorted(raw.get("results", []), key=priority)
        return [
            Provider(
                provider_id=item["provider_id"],
                provider_name=item["provider_name"].strip(),
                logo_path=item.get("logo_path"),
            )
            for item in items
        ]

    async def discover(
        self,
        media_type: MediaType,
        *,
        sort: Sort,
        page: int,
        genres: Sequence[int] = (),
        providers: Sequence[int] = (),
        region: str | None = None,
        year_from: int | None = None,
        year_to: int | None = None,
        max_runtime: int | None = None,
        min_rating: float | None = None,
        language: str | None = None,
    ) -> Page[MediaSummary]:
        """All filters are combined: every genre must match, any of the services is enough."""
        params: dict[str, Any] = {
            "page": page,
            "include_adult": "false",
            **_sort_params(media_type, sort),
        }
        if genres:
            params["with_genres"] = ",".join(map(str, genres))
        if providers and region:
            # "Streaming on": only subscription availability counts, not rent/buy.
            params["with_watch_providers"] = "|".join(map(str, providers))
            params["watch_region"] = region
            params["with_watch_monetization_types"] = "flatrate"
        date_field = _DATE_FIELD[media_type]
        if year_from:
            params[f"{date_field}.gte"] = f"{year_from}-01-01"
        if year_to:
            # Keeps the "newest" sort's cap on future dates if that one is earlier.
            cap = f"{year_to}-12-31"
            params[f"{date_field}.lte"] = min(cap, params.get(f"{date_field}.lte", cap))
        if max_runtime:
            params["with_runtime.lte"] = max_runtime
        if min_rating:
            params["vote_average.gte"] = min_rating
        if language:
            params["with_original_language"] = language

        raw = await self._tmdb.get(
            f"/discover/{media_type}", params, ttl=self._settings.cache_ttl_lists
        )
        results = raw.get("results", [])
        return Page[MediaSummary](
            page=raw.get("page", page),
            # TMDB refuses pages past 500 even when it reports more.
            total_pages=min(raw.get("total_pages", 1), 500),
            total_results=raw.get("total_results", len(results)),
            results=[to_summary(item, media_type) for item in results],
        )
