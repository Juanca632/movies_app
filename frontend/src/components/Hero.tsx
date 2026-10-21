import { useEffect, useRef, useState, type TouchEvent } from "react";
import { Link } from "react-router-dom";
import { useMediaDetail, useMediaList } from "../api/queries";
import { imageUrl, mediaHref, year } from "../lib/tmdb";
import Backdrop from "./Backdrop";
import ErrorState from "./ErrorState";
import Rating from "./Rating";
import TrailerButton from "./TrailerButton";

const SLIDES = 6;
const INTERVAL_MS = 8000;
/** How far a horizontal swipe must travel to change slides. */
const SWIPE_PX = 50;

// `[@media(max-height:500px)]:` below means phones held sideways (and other short screens): the banner is the whole
// screen under the navbar, so the text keeps phone sizes instead of the tablet ones its width
// would get. Written out in full each time, since Tailwind only sees literal class names.

/** Long titles get a smaller type, so they take two lines at most instead of half the banner. */
function titleSize(title: string) {
  if (title.length > 40) return `text-[1.75rem] sm:text-4xl lg:text-5xl [@media(max-height:500px)]:text-[1.75rem]`;
  if (title.length > 22) return `text-3xl sm:text-5xl lg:text-6xl [@media(max-height:500px)]:text-3xl`;
  return `text-4xl sm:text-6xl lg:text-7xl [@media(max-height:500px)]:text-4xl`;
}

// Phones get two equal buttons side by side (a thumb-sized 44px tall); wider screens size them to fit.
const BUTTON = "inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-full px-5 text-sm font-semibold sm:flex-none sm:px-6";

/** Same layout as the slide's text, so nothing moves when the movies arrive. */
function HeroSkeleton() {
  return (
    <div aria-hidden className="max-w-2xl animate-shimmer motion-reduce:animate-none">
      <div className="mb-3 h-3 w-24 rounded bg-white/10" />
      <div className="h-8 w-4/5 rounded-lg bg-white/10 sm:h-14" />
      <div className="mt-2 h-8 w-1/2 rounded-lg bg-white/10 sm:h-14" />
      <div className="mt-4 h-4 w-24 rounded bg-white/10" />
      <div className="mt-4 max-w-xl space-y-2">
        <div className="h-3.5 rounded bg-white/10" />
        <div className="h-3.5 w-11/12 rounded bg-white/10" />
        <div className="hidden h-3.5 w-2/3 rounded bg-white/10 sm:block" />
      </div>
      <div className="mt-6 flex gap-3">
        <div className="h-11 flex-1 rounded-full bg-white/15 sm:w-36 sm:flex-none" />
        <div className="h-11 flex-1 rounded-full bg-white/10 sm:w-32 sm:flex-none" />
      </div>
    </div>
  );
}

/** Home spotlight: rotates through the most popular movies. */
function Hero() {
  const { data, isPending, isError, refetch } = useMediaList("movie", "popular");
  const slides = data?.filter((movie) => movie.backdrop_path).slice(0, SLIDES) ?? [];
  const [index, setIndex] = useState(0);
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  // Restarts on every change, so picking a slide manually gives it the full interval.
  useEffect(() => {
    if (slides.length < 2) return;
    const id = setTimeout(() => setIndex((i) => (i + 1) % slides.length), INTERVAL_MS);
    return () => clearTimeout(id);
  }, [index, slides.length]);

  const movie = slides[index % Math.max(slides.length, 1)];
  const next = slides.length > 1 ? slides[(index + 1) % slides.length] : undefined;
  // Also warms the cache for "View details"; the trailer button only shows once we know there is one.
  const detail = useMediaDetail("movie", String(movie?.id ?? ""), Boolean(movie));

  // Fetch the next backdrop ahead of time, so the slide changes to a ready image.
  useEffect(() => {
    const src = imageUrl(next?.backdrop_path, "w1280");
    if (src) new Image().src = src;
  }, [next?.backdrop_path]);

  // Swiping sideways on phones changes slides, like any native carousel. Mostly vertical
  // gestures are page scrolls and are left alone.
  const onTouchStart = (event: TouchEvent) => {
    const touch = event.touches[0];
    touchStart.current = { x: touch.clientX, y: touch.clientY };
  };
  const onTouchEnd = (event: TouchEvent) => {
    const start = touchStart.current;
    touchStart.current = null;
    if (!start || slides.length < 2) return;
    const touch = event.changedTouches[0];
    const dx = touch.clientX - start.x;
    if (Math.abs(dx) < SWIPE_PX || Math.abs(dx) < Math.abs(touch.clientY - start.y) * 1.5) return;
    setIndex((i) => (i + (dx < 0 ? 1 : slides.length - 1)) % slides.length);
  };

  return (
    <section
      aria-label="Featured"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      className="relative isolate flex h-[80svh] max-h-[760px] min-h-[440px] items-end sm:h-[72vh] lg:h-[88vh] lg:max-h-[960px] [@media(max-height:500px)]:h-svh [@media(max-height:500px)]:min-h-[320px]"
    >
      <Backdrop path={movie?.backdrop_path} pending={isPending} priority />

      <div className="page-x w-full pb-8 sm:pb-16 lg:pb-36 [@media(max-height:500px)]:pb-4">
        {isPending && <HeroSkeleton />}
        {isError && <ErrorState message="Couldn't load featured movies." onRetry={() => refetch()} />}

        {movie && (
          <div key={movie.id} className="max-w-2xl animate-fade-in">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-accent sm:mb-3">Popular now</p>
            <h1 className={`line-clamp-3 font-display font-bold leading-[1.05] tracking-tight text-balance ${titleSize(movie.title)}`}>
              {movie.title}
            </h1>
            <div className="mt-3 flex items-center gap-3 text-sm text-muted sm:mt-4">
              <Rating value={movie.vote_average} className="text-fg" />
              {year(movie.release_date) && <span>{year(movie.release_date)}</span>}
            </div>
            <p
              className="mt-3 line-clamp-2 max-w-xl text-sm leading-relaxed text-muted sm:mt-4 sm:line-clamp-3 sm:text-base [@media(max-height:500px)]:mt-2 [@media(max-height:500px)]:line-clamp-2 [@media(max-height:500px)]:text-sm"
            >
              {movie.overview}
            </p>
            <div className="mt-5 flex gap-3 sm:mt-6 [@media(max-height:500px)]:mt-4">
              <Link
                to={mediaHref(movie.media_type, movie.id, movie.title)}
                className={`${BUTTON} bg-accent text-bg transition hover:bg-accent-strong active:scale-[0.97]`}
              >
                View details
              </Link>
              {detail.data?.trailer && (
                <TrailerButton mediaType="movie" id={movie.id} title={movie.title} label="Trailer" className={`${BUTTON} active:scale-[0.97]`} />
              )}
            </div>
          </div>
        )}

        {/* The bars are thin, but each button has a taller (24px+) area to tap. */}
        {slides.length > 1 && (
          <div className="-mx-1 mt-4 flex sm:mt-6 [@media(max-height:500px)]:mt-1">
            {slides.map((slide, i) => (
              <button
                key={slide.id}
                type="button"
                aria-label={`Show ${slide.title}`}
                aria-current={i === index}
                onClick={() => setIndex(i)}
                className="group px-1 py-3"
              >
                <span
                  className={`block h-1 rounded-full transition-all duration-500 ${i === index ? "w-8 bg-accent" : "w-4 bg-white/30 group-hover:bg-white/60"}`}
                />
              </button>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

export default Hero;
