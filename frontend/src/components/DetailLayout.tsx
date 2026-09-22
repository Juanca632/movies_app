import type { ReactNode } from "react";
import Backdrop from "./Backdrop";

interface DetailHeroProps {
  backdropPath: string | null | undefined;
  blurBackdrop?: boolean;
  aside: ReactNode;
  children: ReactNode;
}

/** Shared header of the movie/TV and person pages: backdrop, poster/photo and info. */
export function DetailHero({ backdropPath, blurBackdrop, aside, children }: DetailHeroProps) {
  return (
    <section className="relative isolate flex flex-col justify-end pt-24 pb-8 sm:pt-32 lg:min-h-[640px]">
      <Backdrop path={backdropPath} blur={blurBackdrop} />
      <div className="page-x grid items-end gap-6 sm:grid-cols-[auto_1fr] sm:gap-10">
        <div className="w-36 overflow-hidden rounded-xl shadow-2xl shadow-black/60 ring-1 ring-white/10 sm:w-52 lg:w-64">
          {aside}
        </div>
        <div className="max-w-3xl animate-fade-in">{children}</div>
      </div>
    </section>
  );
}

export function DetailSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading" className="page-x animate-shimmer pt-24 sm:pt-32">
      <div className="grid items-end gap-6 sm:grid-cols-[auto_1fr] sm:gap-10">
        <div className="aspect-[2/3] w-36 rounded-xl bg-surface-2 sm:w-52 lg:w-64" />
        <div className="max-w-2xl space-y-4">
          <div className="h-12 w-3/4 rounded-lg bg-surface-2" />
          <div className="h-4 w-1/3 rounded bg-surface-2" />
          <div className="h-24 rounded bg-surface-2" />
        </div>
      </div>
    </div>
  );
}
