import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { CardSkeleton } from "./cards";
import ErrorState from "./ErrorState";
import { ChevronLeftIcon, ChevronRightIcon } from "./icons";

const ITEM_WIDTH = {
  media: "w-32 sm:w-40 xl:w-44",
  person: "w-24 sm:w-32",
};

interface RowProps<T> {
  title: string;
  items: T[] | undefined;
  getKey: (item: T) => string | number;
  renderItem: (item: T) => ReactNode;
  variant?: keyof typeof ITEM_WIDTH;
  isPending?: boolean;
  isError?: boolean;
  onRetry?: () => void;
}

/** A titled, horizontally scrollable row of cards with desktop arrows. */
function Row<T>({ title, items, getKey, renderItem, variant = "media", isPending, isError, onRetry }: RowProps<T>) {
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
      <h2 className="page-x mb-3 font-display text-xl font-semibold tracking-tight sm:text-2xl">{title}</h2>

      {isError ? (
        <ErrorState className="page-x" message={`Couldn't load “${title}”.`} onRetry={onRetry} />
      ) : (
        <div className="relative">
          {!edges.start && (
            <button type="button" aria-label="Scroll left" onClick={() => scroll(-1)} className={`${arrow} left-0 bg-gradient-to-r`}>
              <ChevronLeftIcon className="size-8" />
            </button>
          )}
          <ul
            ref={scroller}
            onScroll={updateEdges}
            className="page-x flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto overscroll-x-contain pb-2 scrollbar-none sm:scroll-px-8 sm:gap-4 xl:scroll-px-12"
          >
            {isPending
              ? Array.from({ length: 10 }, (_, i) => (
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
