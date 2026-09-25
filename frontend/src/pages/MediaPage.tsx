import { Fragment } from "react";
import { Link, useParams } from "react-router-dom";
import { isNotFound } from "../api/client";
import { useCollection, useMediaDetail } from "../api/queries";
import type { MediaDetail, MediaType } from "../api/types";
import Acclaim from "../components/Acclaim";
import { DetailHero, DetailSkeleton } from "../components/DetailLayout";
import Rating from "../components/Rating";
import CollectionRow from "../components/CollectionRow";
import { CastRow, MediaRow } from "../components/rows";
import TmdbImage from "../components/TmdbImage";
import TrailerButton from "../components/TrailerButton";
import WatchProviders from "../components/WatchProviders";
import Seasons from "../components/Seasons";
import { formatDate, formatRuntime, personHref, year } from "../lib/tmdb";
import { useDocumentTitle } from "../lib/useDocumentTitle";
import { LoadErrorPage, NotFoundPage } from "./StatusPages";

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

function facts(media: MediaDetail) {
  if (media.media_type === "movie") return [year(media.release_date), formatRuntime(media.runtime)];
  return [
    year(media.release_date),
    media.number_of_seasons ? plural(media.number_of_seasons, "season") : null,
    media.number_of_episodes ? plural(media.number_of_episodes, "episode") : null,
  ];
}

/** "Directed by A and B" for movies, "Created by A, B and C" for TV shows. */
function Creators({ media }: { media: MediaDetail }) {
  const people = media.creators;
  if (people.length === 0) return null;
  return (
    <p className="mt-3 text-sm text-muted">
      {media.media_type === "movie" ? "Directed by " : "Created by "}
      {people.map((person, index) => (
        <Fragment key={person.id}>
          {index > 0 && (index === people.length - 1 ? " and " : ", ")}
          <Link to={personHref(person.id, person.name)} className="font-medium text-fg hover:text-accent">
            {person.name}
          </Link>
        </Fragment>
      ))}
    </p>
  );
}

function NextEpisode({ media }: { media: MediaDetail }) {
  const next = media.next_episode;
  if (!next) return null;
  const date = formatDate(next.air_date);
  return (
    <p className="mt-2 text-sm text-muted">
      <span className="font-semibold text-accent">Next episode</span> · S{next.season_number} E{next.episode_number}
      {next.name && ` “${next.name}”`}
      {date && ` · ${date}`}
    </p>
  );
}

export function MediaDetailView({ media }: { media: MediaDetail }) {
  useDocumentTitle(media.title);
  const backdrop = media.backdrop_path ?? media.images.backdrops[0]?.file_path;
  // The saga has its own row, so its parts would only repeat under "More like this".
  const { data: collection } = useCollection(media.collection?.id ?? null);
  const sagaIds = new Set(collection?.parts.map((part) => part.id));
  const recommendations = media.recommendations.filter((item) => !sagaIds.has(item.id));

  return (
    <article>
      <DetailHero
        backdropPath={backdrop}
        aside={<TmdbImage path={media.poster_path} size="w500" alt={`${media.title} poster`} priority className="aspect-[2/3]" />}
      >
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-accent">
          {media.media_type === "movie" ? "Movie" : "TV Series"}
        </p>
        <h1 className="font-display text-3xl font-bold leading-tight tracking-tight text-balance sm:text-5xl">{media.title}</h1>
        {media.tagline && <p className="mt-2 italic text-muted">{media.tagline}</p>}

        <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
          <Rating value={media.vote_average} className="text-base text-fg" />
          {media.vote_count > 0 && <span className="text-subtle">({media.vote_count.toLocaleString("en-US")} votes)</span>}
          {facts(media)
            .filter(Boolean)
            .map((fact) => (
              <span key={fact} className="before:mr-3 before:content-['·'] first:before:hidden">
                {fact}
              </span>
            ))}
        </div>

        <Creators media={media} />
        <NextEpisode media={media} />

        {media.genres.length > 0 && (
          <ul className="mt-4 flex flex-wrap gap-2">
            {media.genres.map((genre) => (
              <li key={genre.id} className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-medium text-fg/90">
                {genre.name}
              </li>
            ))}
          </ul>
        )}

        <Acclaim imdbId={media.imdb_id} />

        {media.overview && <p className="mt-5 max-w-2xl leading-relaxed text-fg/85">{media.overview}</p>}
        {media.trailer && (
          <TrailerButton mediaType={media.media_type} id={media.id} title={media.title} className="mt-6 px-5 py-2.5 text-sm" />
        )}
      </DetailHero>

      <div className="mt-6 flex flex-col gap-10 sm:gap-12">
        <WatchProviders providers={media.providers} title={media.title} />
        {media.seasons.length > 0 && <Seasons tvId={media.id} seasons={media.seasons} />}
        <CastRow cast={media.cast} />
        {media.collection && <CollectionRow collectionId={media.collection.id} currentId={media.id} />}
        <MediaRow title="More like this" items={recommendations} />
      </div>
    </article>
  );
}

function MediaPage({ mediaType }: { mediaType: MediaType }) {
  const { id = "" } = useParams();
  const { data, isPending, error, refetch } = useMediaDetail(mediaType, id);

  if (isPending) return <DetailSkeleton />;
  if (error) {
    return isNotFound(error) ? (
      <NotFoundPage what={mediaType === "movie" ? "movie" : "TV show"} />
    ) : (
      <LoadErrorPage onRetry={() => refetch()} />
    );
  }
  return <MediaDetailView key={id} media={data} />;
}

export default MediaPage;
