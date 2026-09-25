import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useRegionName, useReleases } from "../api/queries";
import { RELEASE_KINDS, type MediaSummary, type ReleaseKind } from "../api/types";
import { CARD_GRID, CardSkeleton, MediaCard } from "../components/cards";
import Chip from "../components/Chip";
import ErrorState from "../components/ErrorState";
import { ChevronLeftIcon, ChevronRightIcon } from "../components/icons";
import { useRegion } from "../lib/region";
import { useDocumentTitle } from "../lib/useDocumentTitle";

const KIND_LABELS: Record<ReleaseKind, string> = {
  theaters: "In theaters",
  home: "At home",
  tv: "New series",
};

const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;

/** Dates as local calendar days: "2026-10-03" must not shift with the time zone. */
const toDate = (day: string) => new Date(`${day}T00:00:00`);
const isoDay = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

const shiftMonth = (month: string, by: number) => {
  const date = toDate(`${month}-01`);
  date.setMonth(date.getMonth() + by);
  return isoDay(date).slice(0, 7);
};

const monthLabel = (month: string) => toDate(`${month}-01`).toLocaleDateString("en-US", { month: "long", year: "numeric" });
const dayLabel = (day: string) => toDate(day).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

function groupByDay(items: MediaSummary[]) {
  const days = new Map<string, MediaSummary[]>();
  for (const item of items) {
    if (!item.release_date) continue;
    days.set(item.release_date, [...(days.get(item.release_date) ?? []), item]);
  }
  return [...days];
}

function CalendarPage() {
  const [params, setParams] = useSearchParams();
  const today = isoDay(new Date());
  const kindParam = params.get("kind");
  const kind = RELEASE_KINDS.find((k) => k === kindParam) ?? "theaters";
  const monthParam = params.get("month");
  const month = monthParam && MONTH.test(monthParam) ? monthParam : today.slice(0, 7);
  const regionName = useRegionName(useRegion());
  const releases = useReleases(kind, month);
  useDocumentTitle("Release calendar");

  const update = (key: "kind" | "month", value: string) => {
    const next = new URLSearchParams(params);
    next.set(key, value);
    setParams(next, { replace: true, preventScrollReset: true });
  };

  const days = groupByDay(releases.data ?? []);
  // In the current month, start from today; what already came out is one click away.
  const [showEarlier, setShowEarlier] = useState(false);
  const earlier = month === today.slice(0, 7) && !showEarlier ? days.filter(([day]) => day < today).length : 0;
  const shown = days.slice(earlier);

  return (
    <div className="page-x pt-24 sm:pt-28">
      <header className="mb-6">
        <h1 className="font-display text-3xl font-bold tracking-tight sm:text-5xl">Release calendar</h1>
        <p className="mt-2 text-sm text-subtle">
          {kind === "tv" ? "Series premiering worldwide" : `Release dates in ${regionName}`}
        </p>
      </header>

      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div role="group" aria-label="Release type" className="flex flex-wrap gap-2">
          {RELEASE_KINDS.map((k) => (
            <Chip key={k} active={k === kind} onClick={() => update("kind", k)}>
              {KIND_LABELS[k]}
            </Chip>
          ))}
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label="Previous month"
            onClick={() => update("month", shiftMonth(month, -1))}
            className="grid size-9 place-items-center rounded-full text-muted transition hover:bg-white/10 hover:text-fg"
          >
            <ChevronLeftIcon className="size-5" />
          </button>
          <h2 aria-live="polite" className="min-w-40 text-center font-display text-lg font-semibold">
            {monthLabel(month)}
          </h2>
          <button
            type="button"
            aria-label="Next month"
            onClick={() => update("month", shiftMonth(month, 1))}
            className="grid size-9 place-items-center rounded-full text-muted transition hover:bg-white/10 hover:text-fg"
          >
            <ChevronRightIcon className="size-5" />
          </button>
        </div>
      </div>

      {releases.isError ? (
        <ErrorState message="Couldn't load the releases." onRetry={() => releases.refetch()} />
      ) : releases.isPending ? (
        <ul aria-busy="true" aria-label="Loading releases" className={CARD_GRID}>
          {Array.from({ length: 12 }, (_, i) => (
            <li key={i}>
              <CardSkeleton />
            </li>
          ))}
        </ul>
      ) : days.length === 0 ? (
        <p className="text-muted">No releases found for {monthLabel(month)}.</p>
      ) : (
        <div className="flex flex-col gap-10">
          {earlier > 0 && (
            <button
              type="button"
              onClick={() => setShowEarlier(true)}
              className="self-start rounded-full border border-line px-5 py-2 text-sm font-medium text-muted transition hover:border-accent hover:text-accent"
            >
              Show {earlier} earlier {earlier === 1 ? "day" : "days"} this month
            </button>
          )}
          {shown.length === 0 && <p className="text-muted">No more releases this month.</p>}
          {shown.map(([day, items]) => (
            <section key={day} aria-label={dayLabel(day)}>
              <h3 className="mb-4 flex items-center gap-3 border-b border-white/10 pb-2 font-display text-lg font-semibold">
                <span className={day < today ? "text-muted" : ""}>{dayLabel(day)}</span>
                {day === today && <span className="rounded-full bg-accent px-2 py-0.5 text-xs font-semibold text-bg">Today</span>}
              </h3>
              <ul className={CARD_GRID}>
                {items.map((item) => (
                  <li key={`${item.media_type}-${item.id}`}>
                    <MediaCard item={item} />
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

export default CalendarPage;
