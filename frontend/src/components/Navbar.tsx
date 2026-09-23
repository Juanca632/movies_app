import { useEffect, useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { PlayIcon } from "./icons";
import RegionPicker from "./RegionPicker";
import SearchBox from "./SearchBox";

const LINKS = [
  { to: "/browse/movie", label: "Movies", short: "Movies" },
  { to: "/browse/tv", label: "TV Shows", short: "TV" },
];

function Navbar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-colors duration-300 ${
        scrolled ? "bg-bg/85 backdrop-blur-md" : "bg-gradient-to-b from-bg/80 to-transparent"
      }`}
    >
      <nav className="page-x flex h-16 items-center gap-3 sm:gap-6">
        <Link to="/" className="flex shrink-0 items-center gap-2" aria-label="MyMoviesApp home">
          <span className="grid size-8 place-items-center rounded-lg bg-accent text-bg">
            <PlayIcon className="size-4" />
          </span>
          <span className="hidden font-display text-lg font-bold tracking-tight lg:inline">
            MyMovies<span className="text-accent">App</span>
          </span>
        </Link>

        <ul className="flex shrink-0 items-center gap-3 text-sm font-medium sm:gap-5">
          {LINKS.map(({ to, label, short }) => (
            <li key={to}>
              <NavLink
                to={to}
                aria-label={label}
                className={({ isActive }) => `transition-colors hover:text-fg ${isActive ? "text-fg" : "text-muted"}`}
              >
                <span className="sm:hidden">{short}</span>
                <span className="hidden sm:inline">{label}</span>
              </NavLink>
            </li>
          ))}
        </ul>

        <div className="ml-auto flex min-w-0 flex-1 items-center justify-end gap-2 sm:gap-3">
          <SearchBox />
          <RegionPicker />
        </div>
      </nav>
    </header>
  );
}

export default Navbar;
