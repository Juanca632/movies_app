import AskBar from "../components/AskBar";
import Hero from "../components/Hero";
import { CategoryRow, PopularPeopleRow } from "../components/rows";
import { useDocumentTitle } from "../lib/useDocumentTitle";

function HomePage() {
  useDocumentTitle(null);

  return (
    <>
      <Hero />
      <div className="relative z-10 -mt-4 flex flex-col gap-10 sm:gap-12 lg:-mt-24">
        <AskBar />
        <CategoryRow title="Now Playing in Theaters" mediaType="movie" category="now_playing" />
        <CategoryRow title="Trending Movies" mediaType="movie" category="popular" />
        <PopularPeopleRow title="Popular Stars" />
        <CategoryRow title="Coming Soon" mediaType="movie" category="upcoming" />
        <CategoryRow title="Popular TV Shows" mediaType="tv" category="popular" />
        <CategoryRow title="Top Rated TV Shows" mediaType="tv" category="top_rated" />
        <CategoryRow title="All-Time Favorites" mediaType="movie" category="top_rated" />
      </div>
    </>
  );
}

export default HomePage;
