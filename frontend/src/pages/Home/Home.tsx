import MovieList from "../../components/MovieList/MovieList"

function Home() {


  return (
    <div className="bg-zinc-900">
      <div className="h-80 w-full text-white">
        Banner
      </div>
      <div className="flex flex-col gap-10 ">
        <MovieList endpoint={"movie/now_playing"} title={"Currently in Theaters"}/>
        <MovieList endpoint={"movie/upcoming"} title={"Coming Soon"}/>
        <MovieList endpoint={"movie/top_rated"} title={"All-Time Favorites"}/>
        <MovieList endpoint={"movie/popular"} title={"Trending Now"}/>
      </div>
    </div>
  )
}

export default Home