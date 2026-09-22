import { Link } from "react-router-dom";
import type { MediaSummary } from "../api/types";
import { mediaHref, personHref, year } from "../lib/tmdb";
import Rating from "./Rating";
import TmdbImage from "./TmdbImage";
import { UserIcon } from "./icons";

export function MediaCard({ item }: { item: MediaSummary }) {
  return (
    <Link to={mediaHref(item.media_type, item.id, item.title)} className="group block">
      <div className="relative aspect-[2/3] overflow-hidden rounded-lg bg-surface ring-1 ring-white/5 transition duration-300 group-hover:-translate-y-1 group-hover:ring-accent/60 group-hover:shadow-xl group-hover:shadow-black/50">
        <TmdbImage path={item.poster_path} size="w342" alt="" />
        {item.vote_average > 0 && (
          <Rating
            value={item.vote_average}
            className="absolute left-2 top-2 rounded-md bg-black/70 px-1.5 py-0.5 text-xs backdrop-blur-sm"
          />
        )}
      </div>
      <p className="mt-2 truncate text-sm font-medium text-fg group-hover:text-accent">{item.title}</p>
      <p className="text-xs text-subtle">
        {[year(item.release_date), item.media_type === "tv" ? "TV" : null].filter(Boolean).join(" · ") || " "}
      </p>
    </Link>
  );
}

interface PersonCardProps {
  id: number;
  name: string;
  profilePath: string | null;
  subtitle?: string | null;
}

export function PersonCard({ id, name, profilePath, subtitle }: PersonCardProps) {
  return (
    <Link to={personHref(id, name)} className="group block text-center">
      <div className="mx-auto aspect-square overflow-hidden rounded-full bg-surface ring-2 ring-white/5 transition duration-300 group-hover:ring-accent/70">
        <TmdbImage
          path={profilePath}
          size="w185"
          alt=""
          fallback={UserIcon}
          className="transition duration-500 group-hover:scale-105"
        />
      </div>
      <p className="mt-2 truncate text-sm font-medium group-hover:text-accent">{name}</p>
      {subtitle && <p className="truncate text-xs text-subtle">{subtitle}</p>}
    </Link>
  );
}

export function CardSkeleton({ variant }: { variant: "media" | "person" }) {
  return (
    <div aria-hidden className="animate-shimmer">
      <div className={`bg-surface-2 ${variant === "person" ? "aspect-square rounded-full" : "aspect-[2/3] rounded-lg"}`} />
      <div className={`mt-2 h-3.5 w-3/4 rounded bg-surface-2 ${variant === "person" ? "mx-auto" : ""}`} />
    </div>
  );
}
