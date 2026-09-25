from typing import Any

from app.clients.tmdb import TMDBClient
from app.core.config import Settings
from app.schemas.media import (
    CastMember,
    Collection,
    CollectionRef,
    Image,
    Images,
    MediaDetail,
    MediaSummary,
    MediaType,
    Page,
    PersonRef,
    Provider,
    Providers,
    Video,
)

CATEGORIES: dict[str, tuple[str, ...]] = {
    "movie": ("popular", "top_rated", "upcoming", "now_playing"),
    "tv": ("popular", "top_rated", "airing_today", "on_the_air"),
}

# Sub-resources fetched in the same TMDB request as the details.
_APPEND = {
    "movie": "credits,images,watch/providers,recommendations,videos,external_ids",
    "tv": "aggregate_credits,images,watch/providers,recommendations,videos,external_ids",
}

MAX_CAST = 15
MAX_IMAGES = 10


def to_summary(raw: dict[str, Any], media_type: MediaType) -> MediaSummary:
    """Normalise TMDB's movie/tv naming differences (title vs name, ...)."""
    is_movie = media_type == "movie"
    return MediaSummary(
        id=raw["id"],
        media_type=media_type,
        title=(raw.get("title") if is_movie else raw.get("name")) or "",
        overview=raw.get("overview") or "",
        poster_path=raw.get("poster_path"),
        backdrop_path=raw.get("backdrop_path"),
        release_date=(raw.get("release_date") if is_movie else raw.get("first_air_date")) or None,
        vote_average=raw.get("vote_average") or 0,
        vote_count=raw.get("vote_count") or 0,
        genre_ids=raw.get("genre_ids") or [],
    )


def _cast(raw: dict[str, Any]) -> list[CastMember]:
    members = []
    for actor in raw.get("cast", [])[:MAX_CAST]:
        # TV aggregate credits list several roles per actor.
        character = actor.get("character") or next(
            (role.get("character") for role in actor.get("roles", []) if role.get("character")),
            None,
        )
        members.append(
            CastMember(
                id=actor["id"],
                name=actor["name"],
                character=character,
                profile_path=actor.get("profile_path"),
            )
        )
    return members


def _creators(raw: dict[str, Any], credits: dict[str, Any]) -> list[PersonRef]:
    """Who made it: a movie's directors, or a TV show's creators."""
    people = raw.get("created_by") or [
        member for member in credits.get("crew", []) if member.get("job") == "Director"
    ]
    return [PersonRef(id=person["id"], name=person["name"]) for person in people]


def _images(raw: dict[str, Any]) -> Images:
    def pick(items: list[dict[str, Any]]) -> list[Image]:
        return [Image.model_validate(item) for item in items[:MAX_IMAGES]]

    return Images(backdrops=pick(raw.get("backdrops", [])), posters=pick(raw.get("posters", [])))


def _providers(raw: dict[str, Any], region: str) -> Providers | None:
    country = raw.get("results", {}).get(region)
    if not country:
        return None

    def pick(key: str) -> list[Provider]:
        return [Provider.model_validate(item) for item in country.get(key, [])]

    return Providers(
        region=region,
        link=country.get("link"),
        flatrate=pick("flatrate"),
        rent=pick("rent"),
        buy=pick("buy"),
    )


# Preferred kinds of video, best first; clips and featurettes are not trailers.
_TRAILER_TYPES = ("Trailer", "Teaser")


def _trailer(raw: dict[str, Any]) -> Video | None:
    """Best YouTube trailer: trailers before teasers, official first, then the newest."""
    candidates = [
        video
        for video in raw.get("results", [])
        if video.get("site") == "YouTube"
        and video.get("type") in _TRAILER_TYPES
        and video.get("key")
    ]
    if not candidates:
        return None
    # Newest first, then a stable sort by kind and officialness keeps that order within ties.
    candidates.sort(key=lambda video: video.get("published_at") or "", reverse=True)
    candidates.sort(
        key=lambda video: (_TRAILER_TYPES.index(video["type"]), not video.get("official"))
    )
    best = candidates[0]
    return Video(key=best["key"], name=best.get("name") or "Trailer")


class MediaService:
    def __init__(self, tmdb: TMDBClient, settings: Settings) -> None:
        self._tmdb = tmdb
        self._settings = settings

    async def list(
        self, media_type: MediaType, category: str, page: int, region: str | None = None
    ) -> Page[MediaSummary]:
        # Release-based lists (now playing, upcoming...) differ per country.
        params: dict[str, Any] = {"page": page, **({"region": region} if region else {})}
        raw = await self._tmdb.get(
            f"/{media_type}/{category}", params, ttl=self._settings.cache_ttl_lists
        )
        results = raw.get("results", [])

        if media_type == "movie" and category == "upcoming":
            # Movies already in theatres are not "upcoming" any more.
            playing = await self._tmdb.get(
                "/movie/now_playing", params, ttl=self._settings.cache_ttl_lists
            )
            playing_ids = {movie["id"] for movie in playing.get("results", [])}
            results = [movie for movie in results if movie["id"] not in playing_ids]

        return Page[MediaSummary](
            page=raw.get("page", page),
            total_pages=raw.get("total_pages", 1),
            total_results=raw.get("total_results", len(results)),
            results=[to_summary(item, media_type) for item in results],
        )

    async def detail(self, media_type: MediaType, media_id: int, region: str) -> MediaDetail:
        raw = await self._tmdb.get(
            f"/{media_type}/{media_id}",
            {"append_to_response": _APPEND[media_type], "include_image_language": "en,null"},
            ttl=self._settings.cache_ttl_details,
        )
        credits = raw.get("credits") or raw.get("aggregate_credits") or {}
        runtime = raw.get("runtime")
        if runtime is None and raw.get("episode_run_time"):
            runtime = raw["episode_run_time"][0]

        summary = to_summary(raw, media_type)
        return MediaDetail(
            **{
                **summary.model_dump(),
                "genre_ids": [genre["id"] for genre in raw.get("genres", [])],
            },
            tagline=raw.get("tagline") or "",
            status=raw.get("status"),
            homepage=raw.get("homepage") or None,
            original_language=raw.get("original_language"),
            # Movies carry it at the top level; TV shows only in external_ids.
            imdb_id=raw.get("imdb_id") or (raw.get("external_ids") or {}).get("imdb_id") or None,
            genres=raw.get("genres", []),
            runtime=runtime,
            number_of_seasons=raw.get("number_of_seasons"),
            number_of_episodes=raw.get("number_of_episodes"),
            creators=_creators(raw, credits),
            cast=_cast(credits),
            images=_images(raw.get("images", {})),
            providers=_providers(raw.get("watch/providers", {}), region),
            trailer=_trailer(raw.get("videos", {})),
            recommendations=[
                to_summary(item, media_type)
                for item in raw.get("recommendations", {}).get("results", [])
            ],
            collection=(
                CollectionRef.model_validate(raw["belongs_to_collection"])
                if raw.get("belongs_to_collection")
                else None
            ),
        )

    async def collection(self, collection_id: int) -> Collection:
        raw = await self._tmdb.get(
            f"/collection/{collection_id}", ttl=self._settings.cache_ttl_details
        )
        parts = [to_summary(part, "movie") for part in raw.get("parts", [])]
        # TMDB lists parts in no particular order; undated (unannounced) ones go last.
        parts.sort(key=lambda part: (part.release_date is None, part.release_date or ""))
        return Collection(
            id=raw["id"],
            name=raw.get("name") or "",
            overview=raw.get("overview") or "",
            poster_path=raw.get("poster_path"),
            backdrop_path=raw.get("backdrop_path"),
            parts=parts,
        )
