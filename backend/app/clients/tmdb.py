import asyncio
from typing import Any

import httpx

from app.core.cache import TTLStore
from app.core.config import Settings


class TMDBError(Exception):
    """Base class for errors raised by the TMDB client."""


class TMDBNotFoundError(TMDBError):
    """TMDB answered 404 for the requested resource."""


class TMDBUnavailableError(TMDBError):
    """TMDB could not be reached or answered with an unexpected error."""


class TMDBClient:
    """The only place in the backend that talks to TMDB."""

    def __init__(self, settings: Settings, http: httpx.AsyncClient | None = None) -> None:
        self._settings = settings
        self._http = http or httpx.AsyncClient(
            base_url=settings.tmdb_api_url, timeout=settings.tmdb_timeout
        )
        self._cache = TTLStore(settings.cache_max_items)

    async def aclose(self) -> None:
        await self._http.aclose()

    async def get(
        self,
        path: str,
        params: dict[str, Any] | None = None,
        *,
        ttl: float | None = None,
    ) -> dict[str, Any]:
        """GET a TMDB path and return its JSON. Results are cached for `ttl` seconds."""
        query = {"language": self._settings.tmdb_language, **(params or {})}
        cache_key = (path, tuple(sorted(query.items())))

        if ttl:
            cached = self._cache.get(cache_key)
            if cached is not None:
                return cached

        data = await self._request(path, query)

        if ttl:
            self._cache.set(cache_key, data, ttl)
        return data

    async def _request(self, path: str, query: dict[str, Any]) -> dict[str, Any]:
        query = {**query, "api_key": self._settings.tmdb_api_key}
        attempts = self._settings.tmdb_retries + 1
        last_error: Exception | None = None

        for attempt in range(attempts):
            try:
                response = await self._http.get(path, params=query)
            except httpx.TransportError as exc:
                last_error = exc
            else:
                if response.status_code == httpx.codes.NOT_FOUND:
                    raise TMDBNotFoundError(path)
                if response.status_code < httpx.codes.INTERNAL_SERVER_ERROR:
                    if response.is_error:
                        raise TMDBUnavailableError(f"{path}: HTTP {response.status_code}")
                    return response.json()
                last_error = TMDBUnavailableError(f"{path}: HTTP {response.status_code}")

            if attempt < attempts - 1:
                await asyncio.sleep(0.2 * (attempt + 1))

        raise TMDBUnavailableError(str(last_error)) from last_error
