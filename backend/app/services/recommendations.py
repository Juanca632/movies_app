import asyncio

from app.clients.tmdb import TMDBError
from app.core.cache import TTLStore
from app.schemas.me import BecauseYouLiked, ForYou, SavedTitle
from app.schemas.media import MediaSummary
from app.services.media import MediaService

# Seeds per list, newest first: recent saves say more about current taste, and each seed is a
# TMDB request on a cold cache.
MAX_SEEDS = 10
# A favourite counts more than something the user only plans to watch.
WEIGHTS = {"favorite": 2.0, "watchlist": 1.0}
MAX_PICKS = 20
MAX_BECAUSE_ROWS = 3
# A "because you liked" row with fewer titles looks broken.
MIN_ROW = 4

# Recomputing takes up to 20 TMDB requests, and a home page reload asks again.
CACHE_TTL = 600  # seconds
_cache = TTLStore(512)

Key = tuple[str, int]


def _key(item: MediaSummary | SavedTitle) -> Key:
    return (item.media_type, item.id)


async def for_you(
    media: MediaService, favorites: list[SavedTitle], watchlist: list[SavedTitle]
) -> ForYou:
    """Rank TMDB's recommendations for the titles the user saved, Netflix style.

    A title recommended by several saved titles, or near the top of their lists, ranks higher.
    Titles already saved are left out: the user knows them.
    """
    seeds = [("favorite", t) for t in favorites[:MAX_SEEDS]] + [
        ("watchlist", t) for t in watchlist[:MAX_SEEDS]
    ]
    # Details are cached, and already fetched when the title was saved or opened.
    details = await asyncio.gather(
        *(media.detail(seed.media_type, seed.id, "US") for _, seed in seeds),
        return_exceptions=True,
    )
    failures = [d for d in details if isinstance(d, BaseException)]
    for failure in failures:
        # A title gone from TMDB, or a hiccup: the rest still make good recommendations.
        if not isinstance(failure, TMDBError):
            raise failure
    if seeds and len(failures) == len(seeds):
        raise failures[0]

    saved = {_key(t) for t in favorites} | {_key(t) for t in watchlist}
    scores: dict[Key, float] = {}
    titles: dict[Key, MediaSummary] = {}
    because: list[BecauseYouLiked] = []
    in_rows: set[Key] = set()

    for (kind, seed), detail in zip(seeds, details, strict=True):
        if isinstance(detail, BaseException):
            continue
        fresh = [r for r in detail.recommendations if _key(r) not in saved]
        for rank, title in enumerate(fresh):
            key = _key(title)
            titles[key] = title
            # TMDB orders recommendations by relevance; the first ones count the most.
            scores[key] = scores.get(key, 0) + WEIGHTS[kind] / (rank + 1) ** 0.5
        # Similar favourites (two films of a saga) get nearly the same recommendations: a title
        # shows in one "because" row only, and a row left too short gives way to the next one.
        row = [r for r in fresh if _key(r) not in in_rows]
        if kind == "favorite" and len(because) < MAX_BECAUSE_ROWS and len(row) >= MIN_ROW:
            because.append(BecauseYouLiked(source=seed, results=row))
            in_rows.update(map(_key, row))

    ranked = sorted(scores, key=lambda key: (-scores[key], -titles[key].vote_count))
    return ForYou(picks=[titles[key] for key in ranked[:MAX_PICKS]], because=because)


async def cached_for_you(
    media: MediaService, favorites: list[SavedTitle], watchlist: list[SavedTitle]
) -> ForYou:
    """`for_you`, remembered for a while. The key is the lists themselves: saving or removing a
    title changes it, so nothing needs invalidating, on whichever server instance."""
    key = (tuple(map(_key, favorites)), tuple(map(_key, watchlist)))
    result = _cache.get(key)
    if result is None:
        result = await for_you(media, favorites, watchlist)
        _cache.set(key, result, CACHE_TTL)
    return result
