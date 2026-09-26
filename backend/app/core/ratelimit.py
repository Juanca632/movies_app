import time
from collections import deque
from collections.abc import Callable, Hashable


class RateLimiter:
    """Allows `limit` hits per key within a sliding `window` of seconds.

    State lives in this process only: with several instances each one counts on its own,
    so treat it as a guard against a single abusive client, not an exact quota.
    """

    def __init__(
        self, limit: int, window: float, timer: Callable[[], float] = time.monotonic
    ) -> None:
        self._limit = limit
        self._window = window
        self._timer = timer
        self._hits: dict[Hashable, deque[float]] = {}

    def hit(self, key: Hashable) -> bool:
        """Record a hit for `key`; False (and nothing recorded) when it is over the limit."""
        now = self._timer()
        hits = self._hits.setdefault(key, deque())
        while hits and hits[0] <= now - self._window:
            hits.popleft()
        if len(hits) >= self._limit:
            return False
        hits.append(now)
        return True
