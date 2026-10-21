import { Fragment, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { isNotFound } from "../api/client";
import { useCollection, useMediaDetail } from "../api/queries";
import type { MediaDetail, MediaType } from "../api/types";
import Acclaim from "../components/Acclaim";
import { DetailHero, DetailSkeleton } from "../components/DetailLayout";
import Rating from "../components/Rating";
import SaveButtons from "../components/SaveButtons";
import CollectionRow from "../components/CollectionRow";
import { CastRow, MediaRow } from "../components/rows";
import TmdbImage from "../components/TmdbImage";
import TrailerButton from "../components/TrailerButton";
import WatchProviders from "../components/WatchProviders";
import Seasons from "../components/Seasons";
import { formatDate, formatRating, formatRuntime, personHref, year } from "../lib/tmdb";
import { useDocumentTitle } from "../lib/useDocumentTitle";
import { LoadErrorPage, NotFoundPage } from "./StatusPages";

const compactNumber = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 });
const LONG_OVERVIEW = 220;

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

/** Clamped on phones, where a long synopsis would push everything else off the screen. */
function Overview({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);
  const clamp = text.length > LONG_OVERVIEW && !expanded;
  return (
    <div className="mt-5 max-w-2xl max-sm:order-2">
      <p className={`leading-relaxed text-fg/85 ${clamp ? "max-sm:line-clamp-4" : ""}`}>{text}</p>
      {clamp && (
        <button type="button" onClick={() => setExpanded(true)} className="-my-2 py-2 text-sm font-semibold text-accent sm:hidden">
          More
        </button>
      )}
    </div>
  );
}

export function MediaDetailView({ media }: { media: MediaDetail }) {
  useDocumentTitle(media.title);
  const backdrop = media.backdrop_path ?? media.images.backdrops[0]?.file_path;
  // The saga has its own row, so its parts would only repeat under "More like this".
  const { data: collection } = useCollection(media.collection?.id ?? null);
  const sagaIds = new Set(collection?.parts.map((part) => part.id));
  const recommendations = media.recommendations.filter((item) => !sagaIds.has(item.id));
  // The vote count stays glued to the rating, so a wrap never separates them.
  const rating = formatRating(media.vote_average) && (
    <span className="inline-flex items-baseline gap-1.5">
      <Rating value={media.vote_average} className="text-base text-fg" />
      {media.vote_count > 0 && (
        <span className="text-subtle">
          ({compactNumber.format(media.vote_count)}
          <span className="max-[359px]:sr-only"> votes</span>)
        </span>
      )}
    </span>
  );
  const meta = [rating, ...facts(media)].filter(Boolean);

  return (
    <article>
      <DetailHero
        backdropPath={backdrop}
        aside={<TmdbImage path={media.poster_path} size="w500" alt={`${media.title} poster`} priority className="aspect-[2/3]" />}
        header={
          <>
            <p className="mb-1.5 text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-accent sm:mb-2 sm:text-xs">
              {media.media_type === "movie" ? "Movie" : "TV Series"}
            </p>
            <h1 className="font-display text-2xl font-bold leading-tight tracking-tight text-balance break-words min-[400px]:text-3xl sm:text-4xl lg:text-5xl">
              {media.title}
            </h1>
          </>
        }
      >
        {media.tagline && <p className="italic text-muted sm:mt-2">{media.tagline}</p>}

        {/* Every item has its dot in the gap before it; the negative margin pushes the dot of an item
            starting a line out of the clipped box, so a wrapped line never starts with "·". */}
        <div className="mt-3 overflow-hidden text-sm text-muted sm:mt-4">
          <div className="-ml-6 flex flex-wrap items-center gap-y-1">
            {meta.map((item, index) => (
              <span key={index} className="relative whitespace-nowrap pl-6 before:absolute before:left-2.5 before:content-['·']">
                {item}
              </span>
            ))}
          </div>
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

        {/* Phones put the actions first, within thumb reach; desktop keeps them below the overview. */}
        <Acclaim imdbId={media.imdb_id} className="max-sm:order-2" />
        {media.overview && <Overview text={media.overview} />}
        <div className="mt-5 grid grid-cols-2 gap-2 max-sm:order-1 sm:mt-6 sm:flex sm:flex-wrap">
          {media.trailer && (
            <TrailerButton mediaType={media.media_type} id={media.id} title={media.title} solid className="col-span-2 min-h-11 justify-center px-5 text-sm" />
          )}
          <SaveButtons item={media} className="col-span-2" />
        </div>
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
