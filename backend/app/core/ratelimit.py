import time
from collections import deque
from collections.abc import Callable, Hashable


class RateLimiter:
    """Allows `limit` hits per key within a sliding `window` of seconds.

    State lives in this process only: with several instances each one counts on its own,
    so treat it as a guard against a single abusive client, not an exact quota.
    """

    # Past this many keys, the ones with no recent hits are dropped (one per visitor adds up).
    MAX_KEYS = 4096

    def __init__(
        self, limit: int, window: float, timer: Callable[[], float] = time.monotonic
    ) -> None:
        self._limit = limit
        self._window = window
        self._timer = timer
        self._hits: dict[Hashable, deque[float]] = {}

    def _recent(self, key: Hashable, now: float) -> deque[float]:
        hits = self._hits.get(key, deque())
        while hits and hits[0] <= now - self._window:
            hits.popleft()
        return hits

    def allows(self, key: Hashable) -> bool:
        """Whether `key` has room for another hit, without recording one."""
        return len(self._recent(key, self._timer())) < self._limit

    def hit(self, key: Hashable) -> bool:
        """Record a hit for `key`; False (and nothing recorded) when it is over the limit."""
        now = self._timer()
        hits = self._recent(key, now)
        if len(hits) >= self._limit:
            return False
        hits.append(now)
        self._hits[key] = hits
        if len(self._hits) > self.MAX_KEYS:
            self._hits = {k: v for k, v in self._hits.items() if self._recent(k, now)}
        return True
