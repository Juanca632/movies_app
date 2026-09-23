import { useEffect, useId, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useSearch } from "../api/queries";
import type { SearchResult } from "../api/types";
import { resultHref, year } from "../lib/tmdb";
import { useDebouncedValue } from "../lib/useDebouncedValue";
import { SearchIcon, UserIcon } from "./icons";
import TmdbImage from "./TmdbImage";

const MAX_SUGGESTIONS = 6;
const MIN_CHARS = 2;
const DEBOUNCE_MS = 250;

const searchHref = (query: string) => `/search?q=${encodeURIComponent(query)}`;

function describe(result: SearchResult) {
  if (result.media_type === "person") return result.known_for_department ?? "Person";
  return [result.media_type === "tv" ? "TV Show" : "Movie", year(result.release_date)].filter(Boolean).join(" · ");
}

/** Navbar search with live suggestions (an ARIA combobox). */
function SearchBox({ autoFocus = false, className = "max-w-sm" }: { autoFocus?: boolean; className?: string }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();
  const urlQuery = location.pathname === "/search" ? (params.get("q") ?? "") : "";

  const [query, setQuery] = useState(urlQuery);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const container = useRef<HTMLDivElement>(null);
  const listId = useId();

  const term = useDebouncedValue(query.trim(), DEBOUNCE_MS);
  const { data, isFetching } = useSearch(term.length >= MIN_CHARS ? term : "", 1);
  const suggestions = term.length >= MIN_CHARS ? (data?.results.slice(0, MAX_SUGGESTIONS) ?? []) : [];
  // The last option is always "See all results".
  const optionCount = suggestions.length + 1;
  const showList = open && query.trim().length >= MIN_CHARS;

  // Keep the input in sync with the URL (back/forward, new search, leaving search) and close on navigation.
  useEffect(() => setQuery(urlQuery), [urlQuery]);
  useEffect(() => setOpen(false), [location.key]);
  useEffect(() => setActive(-1), [term]);

  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      if (!container.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  const go = (href: string) => {
    setOpen(false);
    navigate(href);
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const trimmed = query.trim();
    if (active >= 0 && active < suggestions.length) go(resultHref(suggestions[active]));
    else if (trimmed) go(searchHref(trimmed));
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      setOpen(false);
      return;
    }
    if (!showList || (event.key !== "ArrowDown" && event.key !== "ArrowUp")) return;
    event.preventDefault();
    // -1 means "back in the input"; moving past either end wraps around through it.
    const next = active + (event.key === "ArrowDown" ? 1 : -1);
    setActive(next >= optionCount ? -1 : next < -1 ? optionCount - 1 : next);
  };

  const optionId = (i: number) => `${listId}-option-${i}`;
  const optionClass = (i: number) =>
    `flex items-center gap-3 px-3 py-2 transition-colors ${i === active ? "bg-accent/15" : ""}`;

  return (
    <div ref={container} className={`relative w-full ${className}`}>
      <form role="search" onSubmit={handleSubmit}>
        <SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-subtle" />
        <input
          type="search"
          autoFocus={autoFocus}
          role="combobox"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Search movies, TV shows, people…"
          aria-label="Search movies, TV shows and people"
          aria-expanded={showList}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={showList && active >= 0 ? optionId(active) : undefined}
          autoComplete="off"
          className="w-full rounded-full border border-white/10 bg-surface/80 py-2 pl-10 pr-4 text-sm text-fg placeholder-subtle outline-none transition focus:border-accent/70 focus:bg-surface"
        />
      </form>

      {showList && (
        <div className="absolute inset-x-0 top-full mt-2 overflow-hidden rounded-xl border border-white/10 bg-surface/95 shadow-2xl shadow-black/60 backdrop-blur-md">
          <ul id={listId} role="listbox" aria-label="Suggestions" className="py-1">
            {suggestions.map((result, i) => (
              <li key={`${result.media_type}-${result.id}`} id={optionId(i)} role="option" aria-selected={i === active}>
                <Link to={resultHref(result)} onClick={() => setOpen(false)} onMouseEnter={() => setActive(i)} className={optionClass(i)}>
                  <span className={`w-8 shrink-0 overflow-hidden bg-surface-2 ${result.media_type === "person" ? "h-8 rounded-full" : "h-12 rounded"}`}>
                    <TmdbImage
                      path={result.media_type === "person" ? result.profile_path : result.poster_path}
                      size="w92"
                      alt=""
                      fallback={result.media_type === "person" ? UserIcon : undefined}
                    />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">
                      {result.media_type === "person" ? result.name : result.title}
                    </span>
                    <span className="block truncate text-xs text-subtle">{describe(result)}</span>
                  </span>
                </Link>
              </li>
            ))}

            {suggestions.length === 0 && (
              <li role="presentation" className="px-3 py-3 text-sm text-subtle">
                {isFetching || term !== query.trim() ? "Searching…" : "No matches yet"}
              </li>
            )}

            <li id={optionId(suggestions.length)} role="option" aria-selected={active === suggestions.length} className="border-t border-white/5">
              <Link
                to={searchHref(query.trim())}
                onClick={() => setOpen(false)}
                onMouseEnter={() => setActive(suggestions.length)}
                className={`${optionClass(suggestions.length)} text-sm font-medium text-accent`}
              >
                <SearchIcon className="size-4" />
                See all results for “{query.trim()}”
              </Link>
            </li>
          </ul>
        </div>
      )}
    </div>
  );
}

export default SearchBox;
