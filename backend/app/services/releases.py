import asyncio
import calendar
from datetime import date, timedelta
from typing import Any, Literal

from app.clients.tmdb import TMDBClient
from app.core.config import Settings
from app.schemas.media import MediaSummary
from app.services.media import to_summary

ReleaseKind = Literal["theaters", "home", "tv"]

# TMDB release types: 2 limited and 3 wide theatrical, 4 digital (streaming, rental...).
_MOVIE_RELEASE_TYPES = {"theaters": (2, 3), "home": (4,)}
# The most popular releases of a month are plenty; each movie costs a release-dates lookup.
MAX_MOVIE_PAGES = 3
MAX_TV_PAGES = 2
# Scripted and miniseries only; no news (10763), reality (10764), soaps (10766) or talk (10767).
_TV_FILTERS = {"with_type": "2|4", "without_genres": "10763,10764,10766,10767"}
_LOOKUPS_AT_ONCE = 8
# Re-releases (a classic back in theaters) are not news: skip movies first released earlier.
MAX_AGE_DAYS = 365


def month_range(month: str) -> tuple[str, str]:
    """ "2026-10" -> ("2026-10-01", "2026-10-31")."""
    year, number = (int(part) for part in month.split("-"))
    last_day = calendar.monthrange(year, number)[1]
    return f"{month}-01", f"{month}-{last_day:02d}"


class ReleasesService:
    def __init__(self, tmdb: TMDBClient, settings: Settings) -> None:
        self._tmdb = tmdb
        self._settings = settings

    async def month(self, kind: ReleaseKind, month: str, region: str) -> list[MediaSummary]:
        """A month's releases, by date (most popular first within a day)."""
        start, end = month_range(month)
        if kind == "tv":
            releases = await self._tv(start, end)
        else:
            releases = await self._movies(_MOVIE_RELEASE_TYPES[kind], start, end, region)
        # Stable sort: within a day, the popularity order from discover is kept.
        return sorted(releases, key=lambda item: item.release_date or "")

    async def _pages(self, path: str, params: dict[str, Any], max_pages: int) -> list[dict]:
        ttl = self._settings.cache_ttl_lists
        first = await self._tmdb.get(path, {**params, "page": 1}, ttl=ttl)
        pages = min(first.get("total_pages", 1), max_pages)
        rest = await asyncio.gather(
            *(
                self._tmdb.get(path, {**params, "page": page}, ttl=ttl)
                for page in range(2, pages + 1)
            )
        )
        return [item for raw in (first, *rest) for item in raw.get("results", [])]

    async def _movies(
        self, types: tuple[int, ...], start: str, end: str, region: str
    ) -> list[MediaSummary]:
        # With `region`, discover filters on that country's release dates but still returns
        # each movie's primary date, so the local date is looked up movie by movie.
        found = await self._pages(
            "/discover/movie",
            {
                "region": region,
                "with_release_type": "|".join(map(str, types)),
                "release_date.gte": start,
                "release_date.lte": end,
                "sort_by": "popularity.desc",
                "include_adult": "false",
            },
            MAX_MOVIE_PAGES,
        )
        limit = asyncio.Semaphore(_LOOKUPS_AT_ONCE)

        async def local_date(movie: dict[str, Any]) -> str | None:
            async with limit:
                raw = await self._tmdb.get(
                    f"/movie/{movie['id']}/release_dates", ttl=self._settings.cache_ttl_static
                )
            dates = [
                release["release_date"][:10]
                for country in raw.get("results", [])
                if country.get("iso_3166_1") == region
                for release in country.get("release_dates", [])
                if release.get("type") in types and release.get("release_date")
            ]
            in_month = [date for date in dates if start <= date <= end]
            return min(in_month, default=None)

        oldest = (date.fromisoformat(start) - timedelta(days=MAX_AGE_DAYS)).isoformat()
        found = [movie for movie in found if (movie.get("release_date") or start) >= oldest]
        dates = await asyncio.gather(*(local_date(movie) for movie in found))
        return [
            to_summary({**movie, "release_date": date}, "movie")
            for movie, date in zip(found, dates, strict=True)
            if date
        ]

    async def _tv(self, start: str, end: str) -> list[MediaSummary]:
        found = await self._pages(
            "/discover/tv",
            {
                "first_air_date.gte": start,
                "first_air_date.lte": end,
                "sort_by": "popularity.desc",
                "include_adult": "false",
                **_TV_FILTERS,
            },
            MAX_TV_PAGES,
        )
        return [to_summary(show, "tv") for show in found if show.get("first_air_date")]
