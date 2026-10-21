import { useEffect, useMemo, useRef } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { useDiscover, useGenres, useProviders, useRegionName } from "../api/queries";
import { DISCOVER_SORTS, type DiscoverSort, type MediaType } from "../api/types";
import { CARD_GRID, CardSkeleton, MediaCard } from "../components/cards";
import Chip from "../components/Chip";
import Dropdown from "../components/Dropdown";
import ErrorState from "../components/ErrorState";
import { useRegion } from "../lib/region";
import { isAdTier } from "../lib/tmdb";
import { useDocumentTitle } from "../lib/useDocumentTitle";
import { NotFoundPage } from "./StatusPages";

const LABELS: Record<MediaType, string> = { movie: "Movies", tv: "TV Shows" };

const SORT_LABELS: Record<DiscoverSort, string> = {
  // Short enough not to be cut off in the half-width dropdown of a 320px phone.
  popular: "Popular",
  top_rated: "Top rated",
  newest: "Newest",
};

const toId = (value: string | null) => (Number(value) > 0 ? Number(value) : null);

function Browse({ mediaType }: { mediaType: MediaType }) {
  const [params, setParams] = useSearchParams();
  const region = useRegion();
  const regionName = useRegionName(region);
  const genres = useGenres(mediaType);
  const providers = useProviders(mediaType, region);

  const sortParam = params.get("sort") as DiscoverSort;
  const sort = DISCOVER_SORTS.includes(sortParam) ? sortParam : "popular";
  const genre = toId(params.get("genre"));
  const services = useMemo(
    () =>
      providers.data
        ?.filter((p) => !isAdTier(p))
        .sort((a, b) => a.provider_name.localeCompare(b.provider_name, "en", { sensitivity: "base" })),
    [providers.data],
  );
  // A service from another country (shared link, or the user switched country) is ignored.
  const providerParam = toId(params.get("provider"));
  const provider = services?.some((p) => p.provider_id === providerParam) ? providerParam : null;
  // Wait for the service list before trusting a provider from the URL, to avoid a wrong first page.
  const ready = !providerParam || !providers.isPending;

  const results = useDiscover(mediaType, { genre, provider, sort }, region, ready);
  const items = results.data?.pages.flatMap((page) => page.results) ?? [];
  const total = results.data?.pages[0]?.total_results;

  const genreName = genres.data?.find((g) => g.id === genre)?.name;
  const serviceName = services?.find((p) => p.provider_id === provider)?.provider_name;
  useDocumentTitle([genreName, LABELS[mediaType]].filter(Boolean).join(" "));

  // A genre chosen elsewhere (a link, the back button) may sit off-screen in the phone's chip scroller.
  const genreBar = useRef<HTMLDivElement>(null);
  const genresLoaded = Boolean(genres.data);
  useEffect(() => {
    const bar = genreBar.current;
    const chip = bar?.querySelector<HTMLElement>("[aria-pressed=true]");
    // Scrolls the bar only: scrollIntoView would also move the page, e.g. a restored scroll position.
    if (bar && chip) bar.scrollTo?.({ left: chip.offsetLeft - bar.offsetLeft - (bar.clientWidth - chip.offsetWidth) / 2, behavior: "smooth" });
  }, [genre, genresLoaded]);

  // Like a native list, the next page loads on its own as the end comes into view (the button stays as
  // a fallback and for keyboards).
  const loadMore = useRef<HTMLDivElement>(null);
  const { hasNextPage, isFetchingNextPage, fetchNextPage } = results;
  useEffect(() => {
    const target = loadMore.current;
    if (!target || !hasNextPage || isFetchingNextPage || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(([entry]) => entry.isIntersecting && fetchNextPage(), { rootMargin: "600px 0px" });
    observer.observe(target);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const update = (key: string, value: string | number | null) => {
    const next = new URLSearchParams(params);
    if (value === null || value === "" || (key === "sort" && value === "popular")) next.delete(key);
    else next.set(key, String(value));
    setParams(next, { replace: true, preventScrollReset: true });
  };

  return (
    <div className="page-x pt-24 sm:pt-28">
      <header className="mb-6">
        <h1 className="font-display text-3xl font-bold tracking-tight sm:text-5xl">
          {genreName ? `${genreName} ` : ""}
          {LABELS[mediaType]}
        </h1>
        {total !== undefined && (
          <p className="mt-2 text-sm text-subtle">
            {total.toLocaleString("en-US")} title{total === 1 ? "" : "s"}
            {serviceName && ` on ${serviceName} in ${regionName}`}
          </p>
        )}
      </header>

      {genres.isError ? (
        <ErrorState className="mb-6" message="Couldn't load genres." onRetry={() => genres.refetch()} />
      ) : (
        <div ref={genreBar} role="group" aria-label="Genres" className="-mx-4 mb-6 flex gap-2 overflow-x-auto overscroll-x-contain px-4 pb-1 scrollbar-none sm:mx-0 sm:flex-wrap sm:px-0">
          <Chip active={genre === null} onClick={() => update("genre", null)}>
            All
          </Chip>
          {genres.data?.map((g) => (
            <Chip key={g.id} active={g.id === genre} onClick={() => update("genre", g.id)}>
              {g.name}
            </Chip>
          ))}
        </div>
      )}

      <div className="mb-8 flex items-end gap-2 sm:gap-6">
        <Dropdown
          label="Sort by"
          value={sort}
          options={DISCOVER_SORTS.map((s) => ({ value: s, label: SORT_LABELS[s] }))}
          onChange={(value) => update("sort", value)}
        />
        <Dropdown
          label={`Streaming in ${regionName}`}
          value={String(provider ?? "")}
          options={[
            { value: "", label: "Any service" },
            ...(services ?? []).map((p) => ({ value: String(p.provider_id), label: p.provider_name })),
          ]}
          onChange={(value) => update("provider", value)}
        />
      </div>

      {results.isError && !items.length ? (
        <ErrorState message={`Couldn't load ${LABELS[mediaType].toLowerCase()}.`} onRetry={() => results.refetch()} />
      ) : results.data && !items.length ? (
        <p className="text-muted">Nothing matches these filters{serviceName ? ` on ${serviceName} in ${regionName}` : ""}. Try another genre or service.</p>
      ) : (
        <ul aria-label="Results" aria-busy={results.isPending} className={CARD_GRID}>
          {results.isPending
            ? Array.from({ length: 18 }, (_, i) => (
                <li key={i}>
                  <CardSkeleton />
                </li>
              ))
            : items.map((item) => (
                <li key={item.id}>
                  <MediaCard item={item} />
                </li>
              ))}
        </ul>
      )}

      {results.hasNextPage && (
        <div ref={loadMore} className="mt-12 flex justify-center">
          <button
            type="button"
            disabled={results.isFetchingNextPage}
            onClick={() => results.fetchNextPage()}
            className="rounded-full border border-line px-6 py-2.5 text-sm font-medium transition hover:border-accent hover:text-accent disabled:opacity-50"
          >
            {results.isFetchingNextPage ? "Loading…" : "Load more"}
          </button>
        </div>
      )}
    </div>
  );
}

function BrowsePage() {
  const { mediaType } = useParams();
  if (mediaType !== "movie" && mediaType !== "tv") return <NotFoundPage />;
  // Remount per media type so genre/provider state never leaks between movies and TV.
  return <Browse key={mediaType} mediaType={mediaType} />;
}

export default BrowsePage;
