import { useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useSeason } from "../api/queries";
import type { Episode, SeasonSummary } from "../api/types";
import { formatDate, formatRating, formatRuntime } from "../lib/tmdb";
import Dropdown from "./Dropdown";
import ErrorState from "./ErrorState";
import TmdbImage from "./TmdbImage";

const LONG_OVERVIEW = 180;
// Seasons can run to hundreds of episodes (soaps, daily shows): start with a few, then batches.
const FIRST_EPISODES = 3;
const EPISODES_PER_BATCH = 10;

const today = () => new Date().toISOString().slice(0, 10);
const hasAired = (date: string | null) => date !== null && date <= today();
// No date means TMDB doesn't know it, not that it is still to come (common for specials).
const isUpcoming = (date: string | null) => date !== null && date > today();

/** The season shown first: the latest regular one already on air, else the first listed. */
function defaultSeason(seasons: SeasonSummary[]) {
  const aired = seasons.filter((season) => season.season_number > 0 && hasAired(season.air_date));
  return (aired[aired.length - 1] ?? seasons[0]).season_number;
}

function Overview({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);
  const isLong = text.length > LONG_OVERVIEW;
  return (
    <>
      <p className={`mt-2 text-sm leading-relaxed text-fg/80 ${isLong && !expanded ? "line-clamp-3" : ""}`}>{text}</p>
      {isLong && (
        <button type="button" onClick={() => setExpanded(!expanded)} className="mt-1 text-xs font-semibold text-accent hover:text-accent-strong">
          {expanded ? "Show less" : "Read more"}
        </button>
      )}
    </>
  );
}

function EpisodeItem({ episode }: { episode: Episode }) {
  const upcoming = isUpcoming(episode.air_date);
  const date = formatDate(episode.air_date);
  const facts = upcoming
    ? [`Airs ${date}`]
    : [date, formatRuntime(episode.runtime), formatRating(episode.vote_average) && `★ ${formatRating(episode.vote_average)}`];

  return (
    <li className="flex gap-4 sm:gap-6">
      <div className={`aspect-video w-32 shrink-0 overflow-hidden rounded-lg bg-surface ring-1 ring-white/5 sm:w-56 ${upcoming ? "opacity-50" : ""}`}>
        <TmdbImage path={episode.still_path} size="w300" alt="" />
      </div>
      <div className="min-w-0 flex-1">
        <h3 className="font-medium text-fg">
          <span className="text-subtle">{episode.episode_number}.</span> {episode.name}
        </h3>
        <p className="mt-0.5 text-xs text-subtle">{facts.filter(Boolean).join(" · ")}</p>
        {episode.overview && <Overview text={episode.overview} />}
      </div>
    </li>
  );
}

const LIST_BUTTON =
  "rounded-full border border-line px-5 py-2 text-sm font-medium text-muted transition hover:border-accent hover:text-accent";

function EpisodeList({ episodes }: { episodes: Episode[] }) {
  const [visible, setVisible] = useState(FIRST_EPISODES);
  const list = useRef<HTMLUListElement>(null);
  const remaining = episodes.length - visible;

  const showLess = () => {
    setVisible(FIRST_EPISODES);
    // After expanding, the button sits far down the page; go back to the top of the list.
    list.current?.scrollIntoView?.({ block: "start", behavior: "smooth" });
  };

  return (
    <>
      <ul ref={list} className="scroll-mt-24 space-y-6">
        {episodes.slice(0, visible).map((episode) => (
          <EpisodeItem key={episode.id} episode={episode} />
        ))}
      </ul>
      {(remaining > 0 || visible > FIRST_EPISODES) && (
        <div className="mt-8 flex flex-wrap gap-3">
          {remaining > 0 && (
            <button type="button" onClick={() => setVisible(visible + EPISODES_PER_BATCH)} className={LIST_BUTTON}>
              Show more episodes · {remaining} left
            </button>
          )}
          {visible > FIRST_EPISODES && (
            <button type="button" onClick={showLess} className={LIST_BUTTON}>
              Show less
            </button>
          )}
        </div>
      )}
    </>
  );
}

function EpisodesSkeleton() {
  return (
    <ul aria-busy="true" aria-label="Loading episodes" className="animate-shimmer space-y-6">
      {Array.from({ length: 3 }, (_, i) => (
        <li key={i} className="flex gap-4 sm:gap-6">
          <div className="aspect-video w-32 shrink-0 rounded-lg bg-surface-2 sm:w-56" />
          <div className="flex-1 space-y-2 pt-1">
            <div className="h-4 w-1/2 rounded bg-surface-2" />
            <div className="h-3 w-1/4 rounded bg-surface-2" />
            <div className="h-12 rounded bg-surface-2" />
          </div>
        </li>
      ))}
    </ul>
  );
}

/** A TV show's episodes, one season at a time; the season lives in the URL (?season=2). */
function Seasons({ tvId, seasons }: { tvId: number; seasons: SeasonSummary[] }) {
  const [params, setParams] = useSearchParams();
  const requested = params.get("season");
  const current =
    seasons.find((season) => String(season.season_number) === requested)?.season_number ?? defaultSeason(seasons);
  const { data: season, isPending, isError, refetch } = useSeason(tvId, current);

  const choose = (value: string) =>
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set("season", value);
        return next;
      },
      { replace: true, preventScrollReset: true },
    );

  return (
    <section aria-label="Episodes" className="page-x">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <h2 className="font-display text-xl font-semibold tracking-tight sm:text-2xl">Episodes</h2>
        {seasons.length > 1 && (
          <Dropdown
            label="Season"
            value={String(current)}
            options={seasons.map((s) => ({
              value: String(s.season_number),
              label: `${s.name} · ${s.episode_count} ${s.episode_count === 1 ? "episode" : "episodes"}`,
            }))}
            onChange={choose}
          />
        )}
      </div>

      {isError ? (
        <ErrorState message="Couldn't load the episodes." onRetry={() => refetch()} />
      ) : isPending ? (
        <EpisodesSkeleton />
      ) : (
        <>
          {season.overview && <p className="-mt-2 mb-6 max-w-3xl text-sm leading-relaxed text-muted">{season.overview}</p>}
          {/* Keyed by season so switching seasons starts from the first batch again. */}
          <EpisodeList key={season.season_number} episodes={season.episodes} />
        </>
      )}
    </section>
  );
}

export default Seasons;
