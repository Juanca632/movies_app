from typing import Any

from app.clients.omdb import OMDbClient
from app.schemas.media import Acclaim, CriticScore

# OMDb source name -> our id, and how to turn its value into what we display.
_SOURCES = {
    "Internet Movie Database": ("imdb", lambda value: value.removesuffix("/10")),
    "Rotten Tomatoes": ("rotten_tomatoes", lambda value: value),
    "Metacritic": ("metacritic", lambda value: value.removesuffix("/100")),
}


def _present(value: Any) -> str | None:
    return value if isinstance(value, str) and value and value != "N/A" else None


def to_acclaim(raw: dict[str, Any] | None) -> Acclaim:
    if not raw:
        return Acclaim()
    scores = []
    for rating in raw.get("Ratings") or []:
        source = _SOURCES.get(rating.get("Source"))
        value = _present(rating.get("Value"))
        if source and value:
            key, display = source
            scores.append(CriticScore(source=key, value=display(value)))
    return Acclaim(awards=_present(raw.get("Awards")), scores=scores)


class AcclaimService:
    def __init__(self, omdb: OMDbClient) -> None:
        self._omdb = omdb

    async def get(self, imdb_id: str) -> Acclaim:
        return to_acclaim(await self._omdb.title(imdb_id))
