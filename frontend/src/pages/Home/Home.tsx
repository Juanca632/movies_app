// import Banner from "../../components/Banner/Banner"
import MovieList from "../../components/MovieList/MovieList"
import TvShowList from "../../components/TvShowList/TvShowList";
import useHomeScrollRestoration from "../../hooks/useScrollRestoration/useScrollRestoration"
import "./Home.scss"

function Home() {

  useHomeScrollRestoration();

  return (
    <div className="home bg-zinc-900">
      {/* <div className="w-full text-white">
        <Banner/>
      </div> */}
      <div className="flex flex-col gap-10 pt-10 pb-10">
        <MovieList endpoint={"movie?category=now_playing"} title={"Currently in Theaters"} person={false}/>
        <MovieList endpoint={"person/trending"} title={"Popular Stars"} person={true}/>
        <MovieList endpoint={"movie?category=popular"} title={"Trending Now"} person={false}/>
        <MovieList endpoint={"movie?category=upcoming"} title={"Coming Soon"} person={false}/>
        <TvShowList endpoint={"tv?category=top_rated"} title={"Top Rated TV shows"} person={false}/> 
        <TvShowList endpoint={"tv?category=popular"} title={"Popular TV shows"} person={false}/> 
        <MovieList endpoint={"movie?category=top_rated"} title={"All-Time Favorites"} person={false}/>
      </div>
    </div>
  )
}

export default Home