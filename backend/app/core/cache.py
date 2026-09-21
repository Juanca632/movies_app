import time
from collections.abc import Hashable
from typing import Any

from cachetools import TLRUCache


class TTLStore:
    """In-memory cache where every entry carries its own time-to-live."""

    def __init__(self, maxsize: int) -> None:
        self._cache: TLRUCache[Hashable, tuple[float, Any]] = TLRUCache(
            maxsize=maxsize,
            ttu=lambda _key, value, now: now + value[0],
            timer=time.monotonic,
        )

    def get(self, key: Hashable) -> Any | None:
        entry = self._cache.get(key)
        return None if entry is None else entry[1]

    def set(self, key: Hashable, value: Any, ttl: float) -> None:
        self._cache[key] = (ttl, value)
