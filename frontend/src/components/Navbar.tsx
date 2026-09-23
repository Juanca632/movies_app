import { useEffect, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { CloseIcon, PlayIcon, SearchIcon } from "./icons";
import RegionPicker from "./RegionPicker";
import SearchBox from "./SearchBox";

const LINKS = [
  { to: "/browse/movie", label: "Movies" },
  { to: "/browse/tv", label: "TV Shows" },
];

function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  // Phones only: the search field replaces the whole bar while it is open.
  const [searchOpen, setSearchOpen] = useState(false);
  const { key } = useLocation();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Picking a suggestion or submitting navigates; the bar goes back to normal.
  useEffect(() => setSearchOpen(false), [key]);

  return (
    <header className="fixed inset-x-0 top-0 z-50">
      {/* The gradient stays and the solid layer fades in over it: swapping one background for the
          other left the bar see-through halfway, flashing the bright hero behind it. */}
      <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-b from-bg/80 to-transparent" />
      <div
        aria-hidden
        className={`absolute inset-0 -z-10 bg-bg/85 backdrop-blur-md transition-opacity duration-300 ${
          scrolled || searchOpen ? "opacity-100" : "opacity-0"
        }`}
      />
      {searchOpen && (
        <div className="page-x flex h-16 items-center gap-2 sm:hidden">
          <SearchBox autoFocus className="" />
          <button
            type="button"
            aria-label="Close search"
            onClick={() => setSearchOpen(false)}
            className="grid size-9 shrink-0 place-items-center rounded-full text-muted transition hover:bg-white/10 hover:text-fg"
          >
            <CloseIcon className="size-5" />
          </button>
        </div>
      )}

      <nav className={`page-x h-16 items-center gap-4 sm:gap-6 ${searchOpen ? "hidden sm:flex" : "flex"}`}>
        <Link to="/" className="flex shrink-0 items-center gap-2" aria-label="MyMoviesApp home">
          <span className="grid size-8 place-items-center rounded-lg bg-accent text-bg">
            <PlayIcon className="size-4" />
          </span>
          <span className="hidden font-display text-lg font-bold tracking-tight lg:inline">
            MyMovies<span className="text-accent">App</span>
          </span>
        </Link>

        <ul className="flex shrink-0 items-center gap-4 text-sm font-medium sm:gap-5">
          {LINKS.map(({ to, label }) => (
            <li key={to}>
              <NavLink
                to={to}
                className={({ isActive }) => `whitespace-nowrap transition-colors hover:text-fg ${isActive ? "text-fg" : "text-muted"}`}
              >
                {label}
              </NavLink>
            </li>
          ))}
        </ul>

        <div className="ml-auto flex min-w-0 flex-1 items-center justify-end gap-2 sm:gap-3">
          <div className="hidden w-full justify-end sm:flex">
            <SearchBox />
          </div>
          <button
            type="button"
            aria-label="Search"
            onClick={() => setSearchOpen(true)}
            className="grid size-9 shrink-0 place-items-center rounded-full border border-white/10 bg-surface/80 text-fg transition hover:border-white/25 sm:hidden"
          >
            <SearchIcon className="size-4" />
          </button>
          <RegionPicker />
        </div>
      </nav>
    </header>
  );
}

export default Navbar;
