import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import movie_navbar from "../../assets/movie_navbar.svg"

function Navbar() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");

  const handleSearch = (event: FormEvent) => {
    event.preventDefault();
    const trimmed = query.trim();
    if (trimmed) navigate(`/search?q=${encodeURIComponent(trimmed)}`);
  };

  return (
    <div className="bg-zinc-900 h-[70px] md:sticky top-0 z-40 xl:px-10 px-5">
      <ul className="w-full h-full flex justify-between items-center gap-3">
        <li className="h-full py-2 cursor-pointer shrink-0"
        onClick={() => navigate("/")}
        >
            <img src={movie_navbar} className="h-full object-contain"/>
        </li>
        <li className="flex-1 max-w-md">
          <form onSubmit={handleSearch}>
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search movies, TV shows, people..."
              aria-label="Search"
              className="w-full rounded-full bg-zinc-800 px-4 py-2 text-zinc-200 placeholder-zinc-500 outline-none focus:ring-2 focus:ring-zinc-500"
            />
          </form>
        </li>
        <motion.li
          className="h-full px-2 hidden sm:flex justify-end items-center cursor-pointer"
          onClick={() => navigate("/")}
          whileTap={{scale:0.9}}
          whileHover={{scale:1.1}}
        >
          <p className="text-zinc-300 text-2xl">Home</p>
        </motion.li>
      </ul>
    </div>
  );
}

export default Navbar;
