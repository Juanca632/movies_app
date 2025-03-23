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
        <MovieList endpoint={"movie/now_playing"} title={"Currently in Theaters"} person={false}/>
        <MovieList endpoint={"trending/person/week"} title={"Popular Stars"} person={true}/>
        <MovieList endpoint={"movie/popular"} title={"Trending Now"} person={false}/>
        <MovieList endpoint={"movie/upcoming"} title={"Coming Soon"} person={false}/>
        <TvShowList endpoint={"tv/top_rated"} title={"Top Rated TV shows"} person={false}/> 
        <TvShowList endpoint={"tv/popular"} title={"Popular TV shows"} person={false}/> 
        <MovieList endpoint={"movie/top_rated"} title={"All-Time Favorites"} person={false}/>
      </div>
    </div>
  )
}

export default Home