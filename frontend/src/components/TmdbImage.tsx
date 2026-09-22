import { useState, type ComponentType, type SVGProps } from "react";
import { imageUrl } from "../lib/tmdb";
import { FilmIcon } from "./icons";

interface TmdbImageProps {
  path: string | null | undefined;
  size: Parameters<typeof imageUrl>[1];
  alt: string;
  className?: string;
  /** Icon shown when TMDB has no image or it fails to load. */
  fallback?: ComponentType<SVGProps<SVGSVGElement>>;
  priority?: boolean;
}

/** A TMDB image that fills its (sized) parent, with a placeholder when missing. */
function TmdbImage({ path, size, alt, className = "", fallback: Fallback = FilmIcon, priority }: TmdbImageProps) {
  const [failed, setFailed] = useState(false);
  const src = imageUrl(path, size);

  if (!src || failed) {
    return (
      <div className={`grid size-full place-items-center bg-surface-2 text-subtle ${className}`}>
        <Fallback className="size-1/3 max-h-16 max-w-16" />
        <span className="sr-only">{alt}</span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
      onError={() => setFailed(true)}
      className={`size-full object-cover ${className}`}
    />
  );
}

export default TmdbImage;
