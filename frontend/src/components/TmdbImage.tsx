import { useLayoutEffect, useRef, useState, type ComponentType, type SVGProps } from "react";
import { holdSplash, isSplashUp } from "../lib/splash";
import { imageUrl } from "../lib/tmdb";
import { FilmIcon } from "./icons";

type ImageSize = Parameters<typeof imageUrl>[1];

/** Pixel width of each TMDB size, for `srcset`. */
const WIDTH: Partial<Record<ImageSize, number>> = { w92: 92, w185: 185, w300: 300, w342: 342, w500: 500, w780: 780, w1280: 1280 };

interface TmdbImageProps {
  path: string | null | undefined;
  /** The default size, used as `src`. */
  size: ImageSize;
  alt: string;
  className?: string;
  /** Icon shown when TMDB has no image or it fails to load. */
  fallback?: ComponentType<SVGProps<SVGSVGElement>>;
  priority?: boolean;
  /** Other sizes to offer in `srcset`, so 3x phones get sharp posters and 1x screens small files. */
  srcSet?: ImageSize[];
  /** The rendered width (CSS `sizes`); required for `srcSet` to pick the right file. */
  sizes?: string;
}

/** A TMDB image that fills its (sized) parent, with a placeholder when missing. */
function TmdbImage({ path, size, alt, className = "", fallback: Fallback = FilmIcon, priority, srcSet, sizes }: TmdbImageProps) {
  const [failed, setFailed] = useState(false);
  const src = imageUrl(path, size);

  if (!src || failed) {
    // `relative` keeps the absolutely positioned sr-only label inside this box. Without it the
    // label escapes scrolling rows (e.g. a cast member with no photo), and mobile browsers zoom
    // the whole page out to fit it.
    return (
      <div className={`relative grid size-full place-items-center bg-surface-2 text-subtle ${className}`}>
        <Fallback className="size-1/3 max-h-16 max-w-16" />
        <span className="sr-only">{alt}</span>
      </div>
    );
  }

  const candidates = srcSet && sizes ? [size, ...srcSet].map((s) => `${imageUrl(path, s)} ${WIDTH[s]}w`).join(", ") : undefined;

  // Keyed by src, so a new image fades in again instead of inheriting the old one's state.
  return (
    <FadeInImg
      key={src}
      src={src}
      srcSet={candidates}
      sizes={candidates ? sizes : undefined}
      alt={alt}
      priority={priority}
      onError={() => setFailed(true)}
      className={`size-full object-cover ${className}`}
    />
  );
}

interface FadeInImgProps {
  src: string;
  srcSet?: string;
  sizes?: string;
  alt: string;
  priority?: boolean;
  onError: () => void;
  className: string;
}

/** Whether an element is at least partly inside the viewport. */
function onScreen(element: Element) {
  const rect = element.getBoundingClientRect();
  return rect.width > 0 && rect.bottom > 0 && rect.right > 0 && rect.top < window.innerHeight && rect.left < window.innerWidth;
}

/** Fades in once decoded instead of popping in line by line over the card's placeholder. */
function FadeInImg({ src, srcSet, sizes, alt, priority, onError, className }: FadeInImgProps) {
  const [loaded, setLoaded] = useState(false);
  // Ready under the splash: shown finished when it lifts, not fading in after it.
  const [instant, setInstant] = useState(false);
  const image = useRef<HTMLImageElement | null>(null);

  // On screen while the splash is up: keep it until this image is decoded (see lib/splash.ts).
  useLayoutEffect(() => {
    const element = image.current;
    if (!element || !isSplashUp() || element.complete || !onScreen(element)) return;
    const release = holdSplash();
    const settle = () => {
      Promise.resolve(element.decode?.()).catch(() => {}).then(release);
    };
    element.addEventListener("load", settle);
    element.addEventListener("error", release);
    return () => {
      element.removeEventListener("load", settle);
      element.removeEventListener("error", release);
      release();
    };
  }, []);

  const markLoaded = () => {
    setInstant(isSplashUp());
    setLoaded(true);
  };

  return (
    <img
      // An image already in the browser's cache can finish before React attaches onLoad.
      ref={(img) => {
        image.current = img;
        if (img?.complete && img.naturalWidth > 0) markLoaded();
      }}
      src={src}
      srcSet={srcSet}
      sizes={sizes}
      alt={alt}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
      onLoad={markLoaded}
      onError={onError}
      className={`${instant ? "" : "transition-[opacity,transform] duration-500"} ease-out motion-reduce:transition-none ${loaded ? "opacity-100" : "opacity-0"} ${className}`}
    />
  );
}

export default TmdbImage;
