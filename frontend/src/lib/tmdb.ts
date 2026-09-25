import type { MediaType, Provider, SearchResult } from "../api/types";

const IMAGE_BASE = "https://image.tmdb.org/t/p";

type ImageSize = "w92" | "w185" | "w300" | "w342" | "w500" | "w780" | "w1280" | "original";

/** Full TMDB image URL, or null when TMDB has no image for it. */
export const imageUrl = (path: string | null | undefined, size: ImageSize) =>
  path ? `${IMAGE_BASE}/${size}${path}` : null;

export const slugify = (text: string) =>
  text
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

// Public URLs keep the historic "/tv-show" prefix so shared links keep working.
const MEDIA_PATH: Record<MediaType, string> = { movie: "movie", tv: "tv-show" };

export const mediaHref = (mediaType: MediaType, id: number, title: string) =>
  `/${MEDIA_PATH[mediaType]}/${id}/${slugify(title)}`;

export const personHref = (id: number, name: string) => `/person/${id}/${slugify(name)}`;

export const resultHref = (result: SearchResult) =>
  result.media_type === "person" ? personHref(result.id, result.name) : mediaHref(result.media_type, result.id, result.title);

/** "Known for Forrest Gump", falling back to the department ("Acting"). */
export const personSubtitle = (person: { known_for: string[]; known_for_department: string | null }) =>
  person.known_for[0] ? `Known for ${person.known_for[0]}` : person.known_for_department;

export const year = (date: string | null | undefined) => date?.slice(0, 4) || null;

export const formatRating = (vote: number) => (vote > 0 ? vote.toFixed(1) : null);

/** 142 -> "2h 22m". */
export const formatRuntime = (minutes: number | null | undefined) => {
  if (!minutes) return null;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h ? `${h}h${m ? ` ${m}m` : ""}` : `${m}m`;
};

export const formatDate = (date: string | null | undefined) =>
  date
    ? new Date(`${date}T00:00:00`).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;

// TMDB lists ad-supported tiers as separate providers ("Netflix basic with Ads"); they only add noise.
export const isAdTier = (provider: Provider) => /with ads$/i.test(provider.provider_name);
