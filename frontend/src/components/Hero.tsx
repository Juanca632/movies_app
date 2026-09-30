import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useMediaDetail, useMediaList } from "../api/queries";
import { mediaHref, year } from "../lib/tmdb";
import Backdrop from "./Backdrop";
import ErrorState from "./ErrorState";
import Rating from "./Rating";
import TrailerButton from "./TrailerButton";

const SLIDES = 6;
const INTERVAL_MS = 8000;

/** Home spotlight: rotates through the most popular movies. */
function Hero() {
  const { data, isPending, isError, refetch } = useMediaList("movie", "popular");
  const slides = data?.filter((movie) => movie.backdrop_path).slice(0, SLIDES) ?? [];
  const [index, setIndex] = useState(0);

  // Restarts on every change, so picking a slide manually gives it the full interval.
  useEffect(() => {
    if (slides.length < 2) return;
    const id = setTimeout(() => setIndex((i) => (i + 1) % slides.length), INTERVAL_MS);
    return () => clearTimeout(id);
  }, [index, slides.length]);

  const movie = slides[index % Math.max(slides.length, 1)];
  // Also warms the cache for "View details"; the trailer button only shows once we know there is one.
  const detail = useMediaDetail("movie", String(movie?.id ?? ""), Boolean(movie));

  return (
    <section aria-label="Featured" className="relative isolate flex h-[85svh] max-h-[760px] min-h-[460px] items-end sm:h-[72vh] lg:h-[88vh] lg:max-h-[960px]">
      <Backdrop path={movie?.backdrop_path} />

      <div className="page-x w-full pb-12 sm:pb-16 lg:pb-36">
        {isPending && (
          <div aria-hidden className="max-w-xl animate-shimmer space-y-4">
            <div className="h-12 w-3/4 rounded-lg bg-surface-2" />
            <div className="h-4 w-1/3 rounded bg-surface-2" />
            <div className="h-16 rounded bg-surface-2" />
          </div>
        )}
        {isError && <ErrorState message="Couldn't load featured movies." onRetry={() => refetch()} />}

        {movie && (
          <div key={movie.id} className="max-w-2xl animate-fade-in">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-accent">Popular now</p>
            <h1 className="font-display text-4xl font-bold leading-[1.05] tracking-tight text-balance sm:text-6xl lg:text-7xl">
              {movie.title}
            </h1>
            <div className="mt-4 flex items-center gap-3 text-sm text-muted">
              <Rating value={movie.vote_average} className="text-fg" />
              {year(movie.release_date) && <span>{year(movie.release_date)}</span>}
            </div>
            <p className="mt-4 line-clamp-3 max-w-xl text-sm leading-relaxed text-muted sm:text-base">{movie.overview}</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                to={mediaHref(movie.media_type, movie.id, movie.title)}
                className="inline-flex items-center rounded-full bg-accent px-6 py-2.5 text-sm font-semibold text-bg transition hover:bg-accent-strong"
              >
                View details
              </Link>
              {detail.data?.trailer && (
                <TrailerButton mediaType="movie" id={movie.id} title={movie.title} className="px-5 py-2.5 text-sm" />
              )}
            </div>
          </div>
        )}

        {slides.length > 1 && (
          <div className="mt-8 flex gap-2">
            {slides.map((slide, i) => (
              <button
                key={slide.id}
                type="button"
                aria-label={`Show ${slide.title}`}
                aria-current={i === index}
                onClick={() => setIndex(i)}
                className={`h-1 rounded-full transition-all duration-500 ${i === index ? "w-8 bg-accent" : "w-4 bg-white/30 hover:bg-white/60"}`}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

export default Hero;
