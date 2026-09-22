import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { PlayIcon } from "./icons";
import SearchBox from "./SearchBox";

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

        <SearchBox />
      </nav>
    </header>
  );
}

export default Navbar;
