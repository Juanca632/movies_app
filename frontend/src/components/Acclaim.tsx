import { useAcclaim } from "../api/queries";
import type { CriticScore } from "../api/types";
import { ExternalIcon, TrophyIcon } from "./icons";

const LABELS: Record<CriticScore["source"], string> = {
  imdb: "IMDb",
  rotten_tomatoes: "Rotten Tomatoes",
  metacritic: "Metacritic",
};

/** Awards and critic scores (OMDb). Renders nothing when there is nothing to show. */
function Acclaim({ imdbId }: { imdbId: string | null }) {
  const { data } = useAcclaim(imdbId);
  if (!data || (!data.awards && !data.scores.length)) return null;

  return (
    <section aria-label="Awards and ratings" className="mt-5 space-y-3">
      {data.scores.length > 0 && (
        <ul className="flex flex-wrap gap-2 text-sm">
          {data.scores.map((score) => (
            <li key={score.source} className="flex items-baseline gap-1.5 rounded-lg bg-black/40 px-3 py-1.5 ring-1 ring-white/10 backdrop-blur-sm">
              <span className="text-xs text-muted">{LABELS[score.source]}</span>
              <span className="font-semibold text-fg">{score.value}</span>
            </li>
          ))}
        </ul>
      )}
      {data.awards && (
        <p className="flex items-start gap-2 text-sm text-fg/90">
          <TrophyIcon className="mt-0.5 size-4 shrink-0 text-accent" />
          <span>
            {data.awards}
            {imdbId && (
              <a
                href={`https://www.imdb.com/title/${imdbId}/awards/`}
                target="_blank"
                rel="noreferrer"
                className="ml-2 inline-flex items-center gap-1 text-xs text-muted hover:text-accent"
              >
                on IMDb <ExternalIcon className="size-3" />
              </a>
            )}
          </span>
        </p>
      )}
    </section>
  );
}

export default Acclaim;
