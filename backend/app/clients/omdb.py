import logging
from typing import Any

import httpx

from app.core.cache import TTLStore
from app.core.config import Settings

logger = logging.getLogger(__name__)


class OMDbClient:
    """Talks to OMDb (IMDb data). Optional extra: failures return None, never raise."""

    def __init__(self, settings: Settings, http: httpx.AsyncClient | None = None) -> None:
        self._settings = settings
        self._http = http or httpx.AsyncClient(timeout=settings.tmdb_timeout)
        self._cache = TTLStore(settings.cache_max_items)

    @property
    def enabled(self) -> bool:
        return bool(self._settings.omdb_api_key)

    async def aclose(self) -> None:
        await self._http.aclose()

    async def title(self, imdb_id: str) -> dict[str, Any] | None:
        """OMDb's record for an IMDb id, or None if unknown, disabled or unreachable."""
        if not self.enabled:
            return None
        cached = self._cache.get(imdb_id)
        if cached is not None:
            return cached or None

        try:
            response = await self._http.get(
                self._settings.omdb_api_url,
                params={"i": imdb_id, "apikey": self._settings.omdb_api_key},
            )
            data = response.json() if response.is_success else None
        except (httpx.HTTPError, ValueError) as exc:
            # Not cached: a transient failure should not hide awards for a whole day.
            logger.warning("OMDb request for %s failed: %s", imdb_id, exc)
            return None

        if not data or data.get("Response") != "True":
            if data and "limit" in str(data.get("Error", "")).lower():
                logger.warning("OMDb daily limit reached")
                return None
            data = {}  # unknown title: remember that too
        self._cache.set(imdb_id, data, self._settings.cache_ttl_static)
        return data or None
