import { useState } from "react";
import { useParams } from "react-router-dom";
import { isNotFound } from "../api/client";
import { usePerson } from "../api/queries";
import type { PersonDetail } from "../api/types";
import { DetailHero, DetailSkeleton } from "../components/DetailLayout";
import { MediaRow } from "../components/rows";
import TmdbImage from "../components/TmdbImage";
import { UserIcon } from "../components/icons";
import { formatDate } from "../lib/tmdb";
import { useDocumentTitle } from "../lib/useDocumentTitle";
import { LoadErrorPage, NotFoundPage } from "./StatusPages";

const LONG_BIO = 600;

function Biography({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);
  const isLong = text.length > LONG_BIO;

  return (
    <div className="mt-5 max-w-2xl">
      <p className={`whitespace-pre-line leading-relaxed text-fg/85 ${isLong && !expanded ? "line-clamp-5" : ""}`}>{text}</p>
      {isLong && (
        <button type="button" onClick={() => setExpanded(!expanded)} className="mt-2 text-sm font-semibold text-accent hover:text-accent-strong">
          {expanded ? "Show less" : "Read more"}
        </button>
      )}
    </div>
  );
}

export function PersonDetailView({ person }: { person: PersonDetail }) {
  useDocumentTitle(person.name);
  // Their best-known work sets the mood of the header.
  const backdrop = [...person.movies, ...person.tv_shows].find((item) => item.backdrop_path)?.backdrop_path;
  const born = formatDate(person.birthday);
  const died = formatDate(person.deathday);

  return (
    <article>
      <DetailHero
        backdropPath={backdrop}
        blurBackdrop
        aside={<TmdbImage path={person.profile_path} size="w500" alt={person.name} fallback={UserIcon} priority className="aspect-[2/3]" />}
      >
        {person.known_for_department && (
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-accent">{person.known_for_department}</p>
        )}
        <h1 className="font-display text-3xl font-bold leading-tight tracking-tight text-balance sm:text-5xl">{person.name}</h1>

        {(born || person.place_of_birth) && (
          <dl className="mt-4 grid gap-1 text-sm text-muted">
            {born && (
              <div className="flex gap-2">
                <dt className="text-subtle">Born</dt>
                <dd>{[born, person.place_of_birth].filter(Boolean).join(" · ")}</dd>
              </div>
            )}
            {died && (
              <div className="flex gap-2">
                <dt className="text-subtle">Died</dt>
                <dd>{died}</dd>
              </div>
            )}
          </dl>
        )}

        {person.biography && <Biography text={person.biography} />}
      </DetailHero>

      <div className="mt-6 flex flex-col gap-10 sm:gap-12">
        <MediaRow title="Movies" items={person.movies} />
        <MediaRow title="TV Shows" items={person.tv_shows} />
      </div>
    </article>
  );
}

function PersonPage() {
  const { id = "" } = useParams();
  const { data, isPending, error, refetch } = usePerson(id);

  if (isPending) return <DetailSkeleton />;
  if (error) return isNotFound(error) ? <NotFoundPage what="person" /> : <LoadErrorPage onRetry={() => refetch()} />;
  return <PersonDetailView key={id} person={data} />;
}

export default PersonPage;
