import { imageUrl } from "../lib/tmdb";

interface BackdropProps {
  path: string | null | undefined;
  blur?: boolean;
  /** Also fade in from the top, for a band in the middle of the page rather than a header. */
  fadeTop?: boolean;
}

/** Full-bleed backdrop that fades into the page background at the bottom and left. */
function Backdrop({ path, blur = false, fadeTop = false }: BackdropProps) {
  const src = imageUrl(path, "w1280");
  return (
    <div aria-hidden className="absolute inset-0 -z-10 overflow-hidden">
      {src && (
        <img
          key={src}
          src={src}
          alt=""
          className={`size-full animate-fade-in object-cover object-top ${blur ? "scale-110 opacity-40 blur-2xl" : "opacity-70"}`}
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/60 to-bg/10" />
      <div className="absolute inset-0 bg-gradient-to-r from-bg/90 via-bg/40 to-transparent" />
      {fadeTop && <div className="absolute inset-0 bg-gradient-to-b from-bg to-transparent to-50%" />}
    </div>
  );
}

export default Backdrop;
