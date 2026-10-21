import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { CardSkeleton } from "./cards";
import ErrorState from "./ErrorState";
import { ChevronLeftIcon, ChevronRightIcon } from "./icons";

// On phones, widths follow the screen so a row always ends in a partly visible card (2.4, 2.75
// or 3.4 posters in view, gutter and gaps included): a cut-off card is what says "swipe for more".
// A fixed width would land on whole cards at some sizes and look like the end of the row.
const ITEM_WIDTH = {
  media:
    "w-[calc((100vw-1rem)/2.4-0.75rem)] min-[360px]:w-[calc((100vw-1rem)/2.75-0.75rem)] min-[480px]:w-[calc((100vw-1rem)/3.4-0.75rem)] sm:w-40 xl:w-44",
  person:
    "w-[calc((100vw-1rem)/2.9-0.75rem)] min-[360px]:w-[calc((100vw-1rem)/3.3-0.75rem)] min-[480px]:w-[calc((100vw-1rem)/4.1-0.75rem)] sm:w-32 xl:w-36",
  // Landscape cards (16:9), e.g. the AI's moods.
  wide: "w-[min(calc((100vw-1rem)/1.3-0.75rem),18rem)] sm:w-72 xl:w-80",
};

interface RowProps<T> {
  title: string;
  /** Shown before the title, e.g. the AI's ✦. */
  icon?: ReactNode;
  /** Shown at the end of the title line (below it on phones), e.g. a field. */
  action?: ReactNode;
  description?: ReactNode;
  items: T[] | undefined;
  getKey: (item: T) => string | number;
  renderItem: (item: T) => ReactNode;
  variant?: keyof typeof ITEM_WIDTH;
  isPending?: boolean;
  isError?: boolean;
  onRetry?: () => void;
}

/** A titled, horizontally scrollable row of cards with desktop arrows. */
function Row<T>({ title, icon, action, description, items, getKey, renderItem, variant = "media", isPending, isError, onRetry }: RowProps<T>) {
  const scroller = useRef<HTMLUListElement>(null);
  const [edges, setEdges] = useState({ start: true, end: true });

  const updateEdges = useCallback(() => {
    const el = scroller.current;
    if (!el) return;
    setEdges({
      start: el.scrollLeft <= 4,
      end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 4,
    });
  }, []);

  useEffect(() => {
    updateEdges();
    window.addEventListener("resize", updateEdges);
    return () => window.removeEventListener("resize", updateEdges);
  }, [updateEdges, items]);

  // Rows with nothing to show (e.g. a movie without cast) just disappear.
  if (!isPending && !isError && !items?.length) return null;

  const scroll = (direction: 1 | -1) => {
    const el = scroller.current;
    el?.scrollBy({ left: direction * el.clientWidth * 0.85, behavior: "smooth" });
  };

  const arrow = "absolute top-0 z-10 hidden h-full w-12 items-center justify-center from-bg/95 to-transparent text-fg opacity-0 transition group-hover/row:opacity-100 hover:text-accent md:flex";

  return (
    <section aria-label={title} className="group/row">
      {action ? (
        <div className="page-x mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
          <h2 className="flex items-center gap-2 font-display text-lg font-semibold tracking-tight min-[360px]:text-xl sm:text-2xl">
            {icon}
            {title}
          </h2>
          {action}
        </div>
      ) : (
        <h2 className="page-x mb-2 flex items-center gap-2 font-display text-lg font-semibold tracking-tight min-[360px]:text-xl sm:text-2xl">
          {icon}
          {title}
        </h2>
      )}
      {description && <p className="page-x -mt-1 mb-3 text-sm text-muted">{description}</p>}

      {isError ? (
        <ErrorState className="page-x" message={`Couldn't load “${title}”.`} onRetry={onRetry} />
      ) : (
        <div className="relative">
          {!edges.start && (
            <button type="button" aria-label="Scroll left" onClick={() => scroll(-1)} className={`${arrow} left-0 bg-gradient-to-r`}>
              <ChevronLeftIcon className="size-8" />
            </button>
          )}
          {/* overflow-x also clips vertically: pt-1 keeps the posters' hover ring visible. Snapping
              uses page-x's own gutter (notch included), so cards stop where the titles start. */}
          <ul
            ref={scroller}
            onScroll={updateEdges}
            className="page-x flex snap-x snap-mandatory scroll-pl-[max(var(--gutter),env(safe-area-inset-left))] scroll-pr-[max(var(--gutter),env(safe-area-inset-right))] gap-3 overflow-x-auto overscroll-x-contain pt-1 pb-2 scrollbar-none sm:gap-4"
          >
            {isPending
              ? Array.from({ length: 8 }, (_, i) => (
                  <li key={i} className={`shrink-0 ${ITEM_WIDTH[variant]}`}>
                    <CardSkeleton variant={variant} />
                  </li>
                ))
              : items?.map((item) => (
                  <li key={getKey(item)} className={`shrink-0 snap-start ${ITEM_WIDTH[variant]}`}>
                    {renderItem(item)}
                  </li>
                ))}
          </ul>
          {!edges.end && (
            <button type="button" aria-label="Scroll right" onClick={() => scroll(1)} className={`${arrow} right-0 bg-gradient-to-l`}>
              <ChevronRightIcon className="size-8" />
            </button>
          )}
        </div>
      )}
    </section>
  );
}

export default Row;
