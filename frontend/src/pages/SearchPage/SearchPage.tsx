import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { useNavigate, useSearchParams } from "react-router-dom";
import Movie from "../../components/Movie/Movie";
import { fetchData, type Page } from "../../hooks/API/API";

type SearchResult =
  | { media_type: "movie" | "tv"; id: number; title: string; poster_path: string | null }
  | { media_type: "person"; id: number; name: string; profile_path: string | null };

const IMAGE_BASE = "https://image.tmdb.org/t/p/w500";

function SearchPage() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const query = params.get("q")?.trim() ?? "";
  const page = Number(params.get("page")) || 1;

  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ["search", query, page],
    queryFn: () => fetchData<Page<SearchResult>>(`search?q=${encodeURIComponent(query)}&page=${page}`),
    enabled: query.length > 0,
    placeholderData: keepPreviousData,
  });

  const goToPage = (next: number) => {
    setParams({ q: query, page: String(next) });
    window.scrollTo(0, 0);
  };

  const open = (result: SearchResult) => {
    if (result.media_type === "person") navigate(`/person/${result.id}/${result.name}`);
    else navigate(`/${result.media_type === "tv" ? "tv-show" : "movie"}/${result.id}/${result.title}`);
  };

  return (
    <div className="min-h-screen bg-zinc-900 text-white xl:px-10 px-5 py-10">
      <h1 className="xl:text-3xl text-2xl font-bold mb-6">
        {query ? <>Results for “{query}”</> : "Type something to search"}
      </h1>

      {isPending && query && <p className="text-zinc-400">Searching...</p>}
      {isError && (
        <p className="text-zinc-400">
          Something went wrong.{" "}
          <button className="underline" onClick={() => refetch()}>Try again</button>
        </p>
      )}
      {data && data.results.length === 0 && <p className="text-zinc-400">No results found.</p>}

      <div className="grid grid-cols-[repeat(auto-fill,minmax(133px,1fr))] sm:grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-4">
        {data?.results.map((result) => {
          const isPerson = result.media_type === "person";
          const title = isPerson ? result.name : result.title;
          const image = isPerson ? result.profile_path : result.poster_path;
          return (
            <div key={`${result.media_type}-${result.id}`} className={isPerson ? "aspect-square" : "aspect-[2/3]"}>
              <Movie
                title={title}
                imageUrl={`${IMAGE_BASE}${image}`}
                person={isPerson}
                id={result.id}
                goToPage={() => open(result)}
              />
            </div>
          );
        })}
      </div>

      {data && data.total_pages > 1 && (
        <div className="flex items-center justify-center gap-6 mt-10">
          <button
            className="px-4 py-2 rounded-full bg-zinc-800 disabled:opacity-40"
            disabled={page <= 1}
            onClick={() => goToPage(page - 1)}
          >
            Previous
          </button>
          <span className="text-zinc-400">{page} / {Math.min(data.total_pages, 500)}</span>
          <button
            className="px-4 py-2 rounded-full bg-zinc-800 disabled:opacity-40"
            disabled={page >= data.total_pages}
            onClick={() => goToPage(page + 1)}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}

export default SearchPage;
