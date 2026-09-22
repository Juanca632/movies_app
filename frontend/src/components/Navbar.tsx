import { useEffect, useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { PlayIcon, SearchIcon } from "./icons";

function Navbar() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [params] = useSearchParams();
  const urlQuery = pathname === "/search" ? (params.get("q") ?? "") : "";
  const [query, setQuery] = useState(urlQuery);
  const [scrolled, setScrolled] = useState(false);

  // Keep the input in sync when the URL changes (back/forward, new search, leaving search).
  useEffect(() => setQuery(urlQuery), [urlQuery]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const trimmed = query.trim();
    if (trimmed) navigate(`/search?q=${encodeURIComponent(trimmed)}`);
  };

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-colors duration-300 ${
        scrolled ? "border-b border-white/5 bg-bg/85 backdrop-blur-md" : "bg-gradient-to-b from-bg/80 to-transparent"
      }`}
    >
      <nav className="page-x flex h-16 items-center justify-between gap-4">
        <Link to="/" className="flex shrink-0 items-center gap-2" aria-label="MyMoviesApp home">
          <span className="grid size-8 place-items-center rounded-lg bg-accent text-bg">
            <PlayIcon className="size-4" />
          </span>
          <span className="hidden font-display text-lg font-bold tracking-tight sm:inline">
            MyMovies<span className="text-accent">App</span>
          </span>
        </Link>

        <form role="search" onSubmit={handleSubmit} className="relative w-full max-w-sm">
          <SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-subtle" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search movies, TV shows, people…"
            aria-label="Search movies, TV shows and people"
            className="w-full rounded-full border border-white/10 bg-surface/80 py-2 pl-10 pr-4 text-sm text-fg placeholder-subtle outline-none transition focus:border-accent/70 focus:bg-surface"
          />
        </form>
      </nav>
    </header>
  );
}

export default Navbar;
