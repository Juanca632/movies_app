import { useEffect, useLayoutEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { useGenres, useMediaDetail } from "../api/queries";
import type { MediaDetail, MediaSummary } from "../api/types";
import { formatRuntime, imageUrl, mediaHref, year } from "../lib/tmdb";
import { openTrailer } from "../lib/trailer";
import { InfoIcon, PlayIcon } from "./icons";
import Rating from "./Rating";

const GUTTER = 16;
const NAVBAR = 72;

function length(detail: MediaDetail | undefined) {
  if (!detail) return null;
  if (detail.media_type === "movie") return formatRuntime(detail.runtime);
  const seasons = detail.number_of_seasons;
  return seasons ? `${seasons} season${seasons === 1 ? "" : "s"}` : null;
}

interface HoverPreviewProps {
  item: MediaSummary;
  anchor: DOMRect;
  onClose: () => void;
}

/** Netflix-style card that grows out of a poster on hover (pointer devices only). */
function HoverPreview({ item, anchor, onClose }: HoverPreviewProps) {
  const panel = useRef<HTMLDivElement>(null);
  // Fetching the detail here also makes opening the full page instant.
  const { data: detail } = useMediaDetail(item.media_type, String(item.id));
  const { data: genres } = useGenres(item.media_type);
  const href = mediaHref(item.media_type, item.id, item.title);

  const width = Math.min(360, Math.max(anchor.width * 1.9, 300));
  const viewportWidth = document.documentElement.clientWidth;
  const left = Math.min(Math.max(anchor.left + anchor.width / 2 - width / 2, GUTTER), viewportWidth - GUTTER - width);

  // Centre it on the poster, then keep it between the navbar and the bottom of the screen.
  useLayoutEffect(() => {
    const el = panel.current;
    if (!el) return;
    const height = el.offsetHeight;
    const centred = anchor.top + anchor.height / 2 - height / 2;
    el.style.top = `${Math.max(NAVBAR, Math.min(centred, window.innerHeight - GUTTER - height))}px`;
  }, [anchor, detail]);

  useEffect(() => {
    // Close as soon as the mouse is anywhere but the preview (also covers it opening
    // clamped away from the pointer, where no pointerleave would ever fire).
    const onPointerMove = (event: PointerEvent) => {
      if (!panel.current?.contains(event.target as Node)) onClose();
    };
    document.addEventListener("pointermove", onPointerMove);
    // Its position is only valid for the current scroll offset.
    window.addEventListener("scroll", onClose, { capture: true, passive: true });
    window.addEventListener("resize", onClose);
    return () => {
      document.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("scroll", onClose, { capture: true });
      window.removeEventListener("resize", onClose);
    };
  }, [onClose]);

  const image = imageUrl(item.backdrop_path, "w780") ?? imageUrl(item.poster_path, "w500");
  const genreNames = item.genre_ids
    .map((id) => genres?.find((genre) => genre.id === id)?.name)
    .filter(Boolean)
    .slice(0, 3);
  const facts = [year(item.release_date), length(detail), item.media_type === "movie" ? "Movie" : "Series"].filter(Boolean);
  const noTrailer = detail !== undefined && !detail.trailer;

  return createPortal(
    <div
      ref={panel}
      role="group"
      aria-label={`${item.title} preview`}
      style={{ left, width, top: anchor.top }}
      className="fixed z-40 animate-pop-in overflow-hidden rounded-xl bg-surface shadow-2xl shadow-black/80 ring-1 ring-white/10"
    >
      <Link to={href} onClick={onClose} tabIndex={-1} className="relative block aspect-video overflow-hidden bg-surface-2">
        {image && <img src={image} alt="" className="size-full animate-ken-burns object-cover" />}
        <div className="absolute inset-0 bg-gradient-to-t from-surface via-surface/10 to-transparent" />
        <h3 className="absolute inset-x-4 bottom-2 line-clamp-2 font-display text-xl font-bold leading-tight tracking-tight drop-shadow">
          {item.title}
        </h3>
      </Link>

      <div className="space-y-3 p-4 pt-3">
        <div className="flex gap-2">
          {!noTrailer && (
            <button
              type="button"
              onClick={() => {
                openTrailer({ mediaType: item.media_type, id: item.id, title: item.title });
                onClose();
              }}
              className="inline-flex items-center gap-1.5 rounded-full bg-accent px-4 py-1.5 text-sm font-semibold text-bg transition hover:bg-accent-strong"
            >
              <PlayIcon className="size-4" />
              Trailer
            </button>
          )}
          <Link
            to={href}
            onClick={onClose}
            className="inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-semibold text-fg ring-1 ring-white/20 transition hover:bg-white/10"
          >
            <InfoIcon className="size-4" />
            Details
          </Link>
        </div>

        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
          <Rating value={item.vote_average} className="text-fg" />
          {facts.map((fact) => (
            <span key={fact} className="before:mr-2 before:content-['·']">
              {fact}
            </span>
          ))}
        </div>

        {genreNames.length > 0 && <p className="text-xs font-medium text-fg/85">{genreNames.join(" · ")}</p>}
        {item.overview && <p className="line-clamp-3 text-xs leading-relaxed text-muted">{item.overview}</p>}
      </div>
    </div>,
    document.body,
  );
}

export default HoverPreview;
