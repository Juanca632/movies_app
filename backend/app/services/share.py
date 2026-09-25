"""Link previews: the Open Graph card chat apps show when someone shares a page.

Crawlers (WhatsApp, Telegram...) don't run JavaScript, so the SPA's index.html looks the same for
every URL. vercel.json and nginx.conf send those crawlers here instead, and this renders a tiny
HTML page whose meta tags describe the title or person behind the shared URL.
"""

from dataclasses import dataclass
from html import escape

from app.schemas.media import MediaDetail
from app.schemas.people import PersonDetail

SITE_NAME = "MyMoviesApp"
SITE_DESCRIPTION = (
    "Discover movies, TV shows and actors: what's in theaters, what's trending and where to "
    "watch it."
)
IMAGE_BASE = "https://image.tmdb.org/t/p"
MAX_DESCRIPTION = 200


@dataclass(frozen=True)
class ShareCard:
    title: str
    description: str
    image: str | None = None
    og_type: str = "website"


DEFAULT_CARD = ShareCard(title=SITE_NAME, description=SITE_DESCRIPTION)


def _truncate(text: str) -> str:
    text = " ".join(text.split())
    if len(text) <= MAX_DESCRIPTION:
        return text
    return text[: MAX_DESCRIPTION - 1].rsplit(" ", 1)[0].rstrip(",;:.-") + "…"


def media_card(media: MediaDetail) -> ShareCard:
    year = media.release_date[:4] if media.release_date else None
    # Chat apps render wide images best, so prefer the backdrop over the poster.
    if media.backdrop_path:
        image = f"{IMAGE_BASE}/w780{media.backdrop_path}"
    elif media.poster_path:
        image = f"{IMAGE_BASE}/w500{media.poster_path}"
    else:
        image = None
    return ShareCard(
        title=f"{media.title} ({year})" if year else media.title,
        description=_truncate(media.overview or media.tagline) or SITE_DESCRIPTION,
        image=image,
        og_type="video.movie" if media.media_type == "movie" else "video.tv_show",
    )


def person_card(person: PersonDetail) -> ShareCard:
    known_for = ", ".join(person.known_for[:3])
    fallback = f"Known for {known_for}" if known_for else SITE_DESCRIPTION
    return ShareCard(
        title=person.name,
        description=_truncate(person.biography) or fallback,
        image=f"{IMAGE_BASE}/w500{person.profile_path}" if person.profile_path else None,
        og_type="profile",
    )


def render(card: ShareCard) -> str:
    tags = {
        "og:site_name": SITE_NAME,
        "og:type": card.og_type,
        "og:title": card.title,
        "og:description": card.description,
        "twitter:card": "summary_large_image" if card.image else "summary",
    }
    if card.image:
        tags["og:image"] = card.image
    # Open Graph uses "property"; Twitter's own tags use "name".
    meta = "\n".join(
        f'    <meta {"name" if key.startswith("twitter:") else "property"}="{key}" '
        f'content="{escape(value)}" />'
        for key, value in tags.items()
    )
    title = escape(card.title if card.title == SITE_NAME else f"{card.title} · {SITE_NAME}")
    return f"""<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>{title}</title>
    <meta name="description" content="{escape(card.description)}" />
{meta}
  </head>
  <body>
    <h1>{escape(card.title)}</h1>
    <p>{escape(card.description)}</p>
  </body>
</html>
"""
