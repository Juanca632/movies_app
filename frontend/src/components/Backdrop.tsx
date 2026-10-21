import { useState } from "react";
import { imageUrl } from "../lib/tmdb";

interface BackdropProps {
  path: string | null | undefined;
  blur?: boolean;
  /** Also fade in from the top, for a band in the middle of the page rather than a header. */
  fadeTop?: boolean;
  /** Load it before anything else, e.g. the home's first banner. */
  priority?: boolean;
  /** The data naming the image is still on its way: pulse like the image's own loading. */
  pending?: boolean;
}

/** Full-bleed backdrop that fades into the page background at the bottom and left. */
function Backdrop({ path, blur = false, fadeTop = false, priority = false, pending = false }: BackdropProps) {
  const src = imageUrl(path, "w1280");
  return (
    <div aria-hidden className="absolute inset-0 -z-10 overflow-hidden">
      {/* Keyed by src, so each new image (e.g. the next hero slide) waits and fades in again. */}
      <BackdropImage key={src ?? "none"} src={src} blur={blur} priority={priority} pending={pending} />
      <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/60 to-bg/10" />
      <div className="absolute inset-0 bg-gradient-to-r from-bg/90 via-bg/40 to-transparent" />
      {fadeTop && <div className="absolute inset-0 bg-gradient-to-b from-bg to-transparent to-50%" />}
    </div>
  );
}

interface BackdropImageProps {
  src: string | null;
  blur: boolean;
  priority: boolean;
  pending: boolean;
}

function BackdropImage({ src, blur, priority, pending }: BackdropImageProps) {
  const [state, setState] = useState<"loading" | "loaded" | "failed">("loading");
  // No placeholder for a title that simply has no backdrop: that page stays plain.
  const placeholder = !blur && (pending || src);

  return (
    <>
      {/* While the image (or the data naming it) is on its way, a softly pulsing surface fills
          the banner, so a cold start reads as "loading" rather than a black page. */}
      {placeholder && (
        // Fades out with the image fading in, so the banner never flashes black in between.
        <div
          className={`absolute inset-0 bg-surface transition-opacity duration-700 ${
            state === "loaded" ? "opacity-0" : state === "loading" ? "animate-shimmer motion-reduce:animate-none" : ""
          }`}
        />
      )}
      {src && state !== "failed" && (
        <img
          src={src}
          alt=""
          fetchPriority={priority ? "high" : undefined}
          onLoad={() => setState("loaded")}
          onError={() => setState("failed")}
          className={`size-full object-cover object-top transition-opacity duration-700 ease-out motion-reduce:transition-none ${
            state === "loaded" ? (blur ? "opacity-40" : "opacity-70") : "opacity-0"
          } ${blur ? "scale-110 blur-2xl" : ""}`}
        />
      )}
    </>
  );
}

export default Backdrop;
