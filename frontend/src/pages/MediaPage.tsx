import { useParams } from "react-router-dom";
import { isNotFound } from "../api/client";
import { useMediaDetail } from "../api/queries";
import type { MediaDetail, MediaType } from "../api/types";
import { DetailHero, DetailSkeleton } from "../components/DetailLayout";
import Rating from "../components/Rating";
import { CastRow, MediaRow } from "../components/rows";
import TmdbImage from "../components/TmdbImage";
import TrailerButton from "../components/TrailerButton";
import WatchProviders from "../components/WatchProviders";
import { formatRuntime, year } from "../lib/tmdb";
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

export function MediaDetailView({ media }: { media: MediaDetail }) {
  useDocumentTitle(media.title);
  const backdrop = media.backdrop_path ?? media.images.backdrops[0]?.file_path;

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

        {media.genres.length > 0 && (
          <ul className="mt-4 flex flex-wrap gap-2">
            {media.genres.map((genre) => (
              <li key={genre.id} className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-medium text-fg/90">
                {genre.name}
              </li>
            ))}
          </ul>
        )}

        {media.overview && <p className="mt-5 max-w-2xl leading-relaxed text-fg/85">{media.overview}</p>}
        {media.trailer && (
          <TrailerButton mediaType={media.media_type} id={media.id} title={media.title} className="mt-6 px-5 py-2.5 text-sm" />
        )}
      </DetailHero>

      <div className="mt-6 flex flex-col gap-10 sm:gap-12">
        <WatchProviders providers={media.providers} title={media.title} />
        <CastRow cast={media.cast} />
        <MediaRow title="More like this" items={media.recommendations} />
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
