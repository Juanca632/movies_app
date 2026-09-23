import { useCallback, useEffect, useRef, useState, type PointerEvent } from "react";
import { Link } from "react-router-dom";
import type { MediaSummary } from "../api/types";
import { mediaHref, personHref, year } from "../lib/tmdb";
import HoverPreview from "./HoverPreview";
import Rating from "./Rating";
import TmdbImage from "./TmdbImage";
import { UserIcon } from "./icons";

/** Responsive poster grid used by the search and browse pages. */
export const CARD_GRID =
  "grid grid-cols-[repeat(auto-fill,minmax(8.5rem,1fr))] gap-x-4 gap-y-8 sm:grid-cols-[repeat(auto-fill,minmax(10.5rem,1fr))]";

// Previews only make sense with a real mouse; touch screens go straight to the page.
const canHover = () => window.matchMedia?.("(hover: hover) and (pointer: fine)").matches ?? false;
const PREVIEW_DELAY_MS = 500;
const PREVIEW_EXIT_MS = 150; // matches --animate-pop-out

/** Opens a hover preview, anchored to the poster, after the mouse rests on a card for a moment. */
function useHoverPreview() {
  const [anchor, setAnchor] = useState<DOMRect | null>(null);
  const [leaving, setLeaving] = useState(false);
  const leavingRef = useRef(false);
  const openTimer = useRef<number>(undefined);
  const exitTimer = useRef<number>(undefined);

  const setLeavingState = (value: boolean) => {
    leavingRef.current = value;
    setLeaving(value);
  };

  // `animate: false` for scrolling or navigating, where a lingering panel would look detached.
  const close = useCallback((animate = true) => {
    window.clearTimeout(exitTimer.current);
    if (!animate) {
      setLeavingState(false);
      setAnchor(null);
      return;
    }
    if (leavingRef.current) return;
    setLeavingState(true);
    exitTimer.current = window.setTimeout(() => {
      setLeavingState(false);
      setAnchor(null);
    }, PREVIEW_EXIT_MS);
  }, []);

  useEffect(
    () => () => {
      window.clearTimeout(openTimer.current);
      window.clearTimeout(exitTimer.current);
    },
    [],
  );

  const handlers = {
    onPointerEnter: (event: PointerEvent<HTMLElement>) => {
      if (event.pointerType !== "mouse" || !canHover()) return;
      const poster = event.currentTarget.firstElementChild ?? event.currentTarget;
      openTimer.current = window.setTimeout(() => {
        // Hovering again right after leaving must not be undone by a pending fade-out.
        window.clearTimeout(exitTimer.current);
        setLeavingState(false);
        setAnchor(poster.getBoundingClientRect());
      }, PREVIEW_DELAY_MS);
    },
    onPointerLeave: () => window.clearTimeout(openTimer.current),
  };
  return { anchor, leaving, close, handlers };
}

export function MediaCard({ item }: { item: MediaSummary }) {
  const preview = useHoverPreview();

  return (
    <>
      <Link to={mediaHref(item.media_type, item.id, item.title)} className="group block" {...preview.handlers}>
        <div className="relative aspect-[2/3] overflow-hidden rounded-lg bg-surface ring-1 ring-white/5 transition duration-300 group-hover:ring-accent/60">
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
      {preview.anchor && <HoverPreview item={item} anchor={preview.anchor} leaving={preview.leaving} onClose={preview.close} />}
    </>
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
