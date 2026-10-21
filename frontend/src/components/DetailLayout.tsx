import type { ReactNode } from "react";
import Backdrop from "./Backdrop";

interface DetailHeroProps {
  backdropPath: string | null | undefined;
  blurBackdrop?: boolean;
  aside: ReactNode;
  /** Kicker and title: beside the poster on phones, above the rest from `sm` up. */
  header: ReactNode;
  children: ReactNode;
}

/**
 * Shared header of the movie/TV and person pages: backdrop, poster/photo and info.
 *
 * On phones the backdrop is a 16:9 band at the top (stretched over a tall column it would be a
 * blurry 5x crop) with a small poster overlapping its bottom and the title beside it, so the
 * actions fit in the first screen, as in native streaming apps.
 */
export function DetailHero({ backdropPath, blurBackdrop, aside, header, children }: DetailHeroProps) {
  return (
    <section className="relative isolate flex flex-col justify-end pt-[max(5rem,calc(56.25vw-3.5rem))] pb-8 sm:pt-32 lg:min-h-[640px]">
      <div className="absolute inset-x-0 top-0 -z-10 aspect-video sm:inset-0 sm:aspect-auto">
        <Backdrop path={backdropPath} blur={blurBackdrop} />
      </div>
      <div className="page-x grid grid-cols-[6.5rem_1fr] items-end gap-x-4 min-[360px]:grid-cols-[7.5rem_1fr] sm:grid-cols-[auto_1fr] sm:gap-x-10">
        <div className="w-full overflow-hidden rounded-lg shadow-2xl shadow-black/60 ring-1 ring-white/10 sm:w-52 sm:rounded-xl lg:w-64">
          {aside}
        </div>
        {/* A grid cell of its own from `sm` up; on phones its parts join the grid around the poster. */}
        <div className="contents sm:block sm:max-w-3xl">
          <div className="min-w-0 animate-fade-in">{header}</div>
          <div className="col-span-2 mt-4 flex min-w-0 animate-fade-in flex-col sm:mt-0">{children}</div>
        </div>
      </div>
    </section>
  );
}

const bar = "rounded bg-surface-2";

/** Mirrors DetailHero and the first row, so nothing jumps when the (often cold-starting) API answers. */
export function DetailSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading" className="animate-shimmer">
      <DetailHero
        backdropPath={null}
        aside={<div className="aspect-[2/3] bg-surface-2" />}
        header={
          <>
            <div className={`mb-3 h-3 w-16 ${bar}`} />
            <div className={`h-7 w-11/12 ${bar} sm:h-12 sm:w-3/4`} />
            <div className={`mt-2 h-7 w-2/3 ${bar} sm:hidden`} />
          </>
        }
      >
        <div className={`mt-4 h-4 w-3/4 ${bar} sm:w-1/3`} />
        <div className="mt-4 flex gap-2">
          {[16, 24, 20].map((width) => (
            <div key={width} className="h-6 rounded-full bg-surface-2" style={{ width: `${width * 0.25}rem` }} />
          ))}
        </div>
        <div className="mt-6 grid grid-cols-2 gap-2 sm:flex">
          <div className="col-span-2 h-11 rounded-full bg-surface-2 sm:w-40" />
          <div className="h-11 rounded-full bg-surface-2 sm:w-28" />
          <div className="h-11 rounded-full bg-surface-2 sm:w-28" />
        </div>
        <div className="mt-5 max-w-2xl space-y-2.5">
          <div className={`h-4 ${bar}`} />
          <div className={`h-4 ${bar}`} />
          <div className={`h-4 ${bar}`} />
          <div className={`h-4 w-4/5 ${bar}`} />
        </div>
      </DetailHero>
      <div className="page-x mt-6">
        <div className={`mb-4 h-6 w-40 ${bar}`} />
        <div className="flex gap-3 overflow-hidden sm:gap-4">
          {Array.from({ length: 8 }, (_, i) => (
            <div key={i} className="aspect-[2/3] w-[38%] shrink-0 rounded-lg bg-surface-2 min-[480px]:w-[27%] sm:w-40 xl:w-44" />
          ))}
        </div>
      </div>
    </div>
  );
}
