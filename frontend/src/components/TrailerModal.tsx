import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useLocation } from "react-router-dom";
import { useMediaDetail } from "../api/queries";
import { closeTrailer, useTrailerRequest, type TrailerRequest } from "../lib/trailer";
import ErrorState from "./ErrorState";
import { CloseIcon } from "./icons";

function TrailerDialog({ request }: { request: TrailerRequest }) {
  const { data, isPending, isError, refetch } = useMediaDetail(request.mediaType, String(request.id));
  const closeButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButton.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeTrailer();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus?.();
    };
  }, []);

  const trailer = data?.trailer;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${request.title} trailer`}
      onClick={(event) => event.target === event.currentTarget && closeTrailer()}
      className="fixed inset-0 z-[70] grid animate-fade-in place-items-center bg-black/85 p-4 backdrop-blur-sm [animation-duration:200ms] sm:p-8"
    >
      <div className="w-full max-w-5xl">
        <div className="mb-3 flex items-center justify-between gap-4">
          <h2 className="truncate font-display text-lg font-semibold sm:text-xl">{request.title}</h2>
          <button
            ref={closeButton}
            type="button"
            aria-label="Close trailer"
            onClick={closeTrailer}
            className="grid size-9 shrink-0 place-items-center rounded-full bg-white/10 text-fg transition hover:bg-white/20"
          >
            <CloseIcon className="size-5" />
          </button>
        </div>

        <div className="grid aspect-video place-items-center overflow-hidden rounded-xl bg-black shadow-2xl shadow-black ring-1 ring-white/10">
          {trailer ? (
            <iframe
              src={`https://www.youtube-nocookie.com/embed/${trailer.key}?autoplay=1&rel=0`}
              title={trailer.name}
              allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
              allowFullScreen
              className="size-full"
            />
          ) : isPending ? (
            <div aria-label="Loading trailer" className="size-full animate-shimmer bg-surface" />
          ) : isError ? (
            <ErrorState message="Couldn't load the trailer." onRetry={() => refetch()} />
          ) : (
            <p className="px-6 text-center text-muted">No trailer available for {request.title}.</p>
          )}
        </div>
      </div>
    </div>
  );
}

/** Mounted once in the layout; plays whatever trailer `openTrailer` asked for. */
function TrailerModal() {
  const request = useTrailerRequest();
  const { key } = useLocation();
  // Browser back/forward while a trailer plays should not leave it floating over the new page.
  useEffect(() => closeTrailer, [key]);
  return request ? createPortal(<TrailerDialog key={`${request.mediaType}-${request.id}`} request={request} />, document.body) : null;
}

export default TrailerModal;
