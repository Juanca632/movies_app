import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";

const DELAY_MS = 3000;

/**
 * The backend is a serverless function: after a quiet while its first answer takes seconds.
 * If skeletons are still waiting on it after a moment, say so, until anything answers.
 */
function WakeNotice() {
  const client = useQueryClient();
  const [waking, setWaking] = useState(false);

  useEffect(() => {
    const cache = client.getQueryCache();
    let awake = false;
    const timer = setTimeout(() => {
      // Only queries with nothing to show yet, and none of the account's (they show no skeleton).
      // With the last visit restored the page is already filled; then side queries like the
      // hero's trailer lookup don't count, only the restored kind.
      const restored = cache.findAll({ predicate: (query) => query.meta?.persist === true && query.state.data !== undefined });
      const waiting = cache
        .findAll({ fetchStatus: "fetching" })
        .some(
          (query) =>
            query.state.data === undefined &&
            query.queryKey[0] !== "me" &&
            (restored.length === 0 || query.meta?.persist === true),
        );
      if (!awake && waiting) setWaking(true);
    }, DELAY_MS);
    const unsubscribe = cache.subscribe((event) => {
      if (event.type === "updated" && event.action.type === "success") {
        awake = true;
        setWaking(false);
      }
    });
    return () => {
      clearTimeout(timer);
      unsubscribe();
    };
  }, [client]);

  return (
    <div role="status" className="pointer-events-none fixed inset-x-0 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-[55] flex justify-center px-4 sm:bottom-6">
      {waking && (
        <p className="flex animate-pop-in items-center gap-3 rounded-full bg-surface/95 py-2.5 pr-5 pl-3 text-sm shadow-2xl shadow-black/60 ring-1 ring-white/10 backdrop-blur-md motion-reduce:animate-none">
          <span aria-hidden className="size-4 shrink-0 animate-spin rounded-full border-2 border-accent/30 border-t-accent" />
          <span>
            <span className="font-medium text-fg">Waking up the server…</span>{" "}
            <span className="hidden text-muted sm:inline">the first load takes a few seconds.</span>
          </span>
        </p>
      )}
    </div>
  );
}

export default WakeNotice;
