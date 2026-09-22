import { useSearchParams } from "react-router-dom";
import { useSearch } from "../api/queries";
import { CardSkeleton, MediaCard, PersonCard } from "../components/cards";
import ErrorState from "../components/ErrorState";
import { SearchIcon } from "../components/icons";
import { useDocumentTitle } from "../lib/useDocumentTitle";

// TMDB never serves pages past 500.
const MAX_PAGES = 500;

function SearchPage() {
  const [params, setParams] = useSearchParams();
  const query = params.get("q")?.trim() ?? "";
  const page = Math.max(1, Number(params.get("page")) || 1);
  const { data, isPending, isError, isPlaceholderData, refetch } = useSearch(query, page);
  const totalPages = Math.min(data?.total_pages ?? 0, MAX_PAGES);

  useDocumentTitle(query ? `“${query}”` : "Search");

  const goToPage = (next: number) => {
    setParams({ q: query, page: String(next) });
    window.scrollTo({ top: 0 });
  };

  return (
    <div className="page-x pt-24 sm:pt-28">
      {!query ? (
        <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 text-center text-muted">
          <SearchIcon className="size-10 text-subtle" />
          <p>Search for movies, TV shows and people using the bar above.</p>
        </div>
      ) : (
        <>
          <header className="mb-8">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">Search</p>
            <h1 className="mt-1 font-display text-2xl font-bold tracking-tight sm:text-4xl">“{query}”</h1>
            {data && (
              <p className="mt-1 text-sm text-subtle">
                {data.total_results.toLocaleString("en-US")} result{data.total_results === 1 ? "" : "s"}
              </p>
            )}
          </header>

          {isError && <ErrorState message="Search failed." onRetry={() => refetch()} />}
          {data?.results.length === 0 && <p className="text-muted">No results. Try another title or name.</p>}

          <ul
            aria-busy={isPending || isPlaceholderData}
            className={`grid grid-cols-[repeat(auto-fill,minmax(8.5rem,1fr))] gap-x-4 gap-y-8 transition-opacity sm:grid-cols-[repeat(auto-fill,minmax(10.5rem,1fr))] ${isPlaceholderData ? "opacity-50" : ""}`}
          >
            {isPending
              ? Array.from({ length: 12 }, (_, i) => (
                  <li key={i}>
                    <CardSkeleton variant="media" />
                  </li>
                ))
              : data?.results.map((result) => (
                  <li key={`${result.media_type}-${result.id}`}>
                    {result.media_type === "person" ? (
                      <div className="px-3 pt-4">
                        <PersonCard id={result.id} name={result.name} profilePath={result.profile_path} subtitle={result.known_for_department} />
                      </div>
                    ) : (
                      <MediaCard item={result} />
                    )}
                  </li>
                ))}
          </ul>

          {totalPages > 1 && (
            <nav aria-label="Pagination" className="mt-12 flex items-center justify-center gap-4 text-sm">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => goToPage(page - 1)}
                className="rounded-full border border-line px-4 py-2 font-medium transition hover:border-accent hover:text-accent disabled:pointer-events-none disabled:opacity-40"
              >
                Previous
              </button>
              <span className="text-subtle">
                Page {page} of {totalPages}
              </span>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => goToPage(page + 1)}
                className="rounded-full border border-line px-4 py-2 font-medium transition hover:border-accent hover:text-accent disabled:pointer-events-none disabled:opacity-40"
              >
                Next
              </button>
            </nav>
          )}
        </>
      )}
    </div>
  );
}

export default SearchPage;
