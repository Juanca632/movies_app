import { useEffect, useState } from "react";
import { fetchData } from "../../hooks/API/API";
import { useParams } from "react-router-dom";
import MovieList from "../../components/MovieList/MovieList";
import { motion } from "framer-motion";
// import loading_img from "../../assets/loading_banner_img.jpg"
import star from "../../assets/star.png"

interface MovieImage {
  file_path: string;
  height: number;
  width: number;
  vote_average: number;
}

interface CastMember {
  id: number;
  name: string;
  profile_path: string | null;
}

interface MediaItem {
  id: number;
  title: string;
  poster_path: string | null;
}

interface DataType {
  backdrops: MovieImage[];
  posters: MovieImage[];
}

interface FlatrateType{
  logo_path: string | null;
  provider_name: string;
}

interface ProvidersType{
  link: string | null;
  flatrate: FlatrateType[];
}

interface MovieDetails {
  title: string;
  overview: string;
  vote_average: number;
  release_date: string | null;
  genres: { id: number; name: string }[];
  images: DataType;
  providers: ProvidersType | null;
  cast: CastMember[];
  recommendations: MediaItem[];
}

function MoviePage() {
  const { id } = useParams<{ title: string; id: string }>();
  const [dataImage, setDataImage] = useState<DataType | null>(null);
  const [dataProviders, setDataProviders] = useState<ProvidersType | null>(null);
  const [movieDetails, setMovieDetails] = useState<MovieDetails | null>(null) 
  const [error, setError] = useState<string | null>(null); // State to manage error
  const [imagePoster, setImagePoster] =  useState<string | null>(null);


  useEffect(() => {
      window.scrollTo(0, 0); 
      setDataImage(null);
      setDataProviders(null);
  }, [id]);

  useEffect(() => {
    if (dataImage && dataImage.posters.length > 0) {
      setImagePoster(`https://image.tmdb.org/t/p/w500${dataImage.posters[0].file_path}`);
    }
  }, [dataImage?.posters]); 

  // useEffect will handle fetching the movie and retrying if necessary
  useEffect(() => {
    const fetchMovies = async () => {
      try {
        const detail = await fetchData<MovieDetails>(`movie/${id}`);
        setDataImage(detail.images);
        setDataProviders(detail.providers);
        setMovieDetails(detail);
        setError(null);

      } catch (error) {
        console.error("Error fetching movie:", error);
        setError("Error fetching data. Retrying..."); // Set an error message
      }
    };

    // Call immediately to try to fetch data when the component mounts
    fetchMovies();

    // If there is an error, retry fetching after 5 seconds
    const intervalId = setInterval(() => {
      if (error) {
        fetchMovies();
      }
    }, 5000); // Retry every 5 seconds

    // Cleanup the interval when the component is unmounted or when the fetch is successful
    return () => clearInterval(intervalId);
  }, [error, id]); // Dependency is the error and id, so the effect reruns when an error occurs or the id changes

  // Find the first image with aspect_ratio 1.778
  // const findImageWithAspectRatio = (images: MovieImage[]) => {
  //   return images.find((image) => image.aspect_ratio === 1.778);
  // };

  return (
    <div className="min-h-screen w-full bg-zinc-900 text-4xl text-white md:py-10 py-0">
        <div className="grid xl:grid-cols-[auto_1fr] xl:grid-rows-[auto] xl:gap-20 gap-5 grid-cols-[auto] grid-rows-[auto-auto]  w-full md:py-5 pb-5 md:px-10 px-0 relative">
          <div className="relative flex justify-center items-center">
            {imagePoster != null ? (
                <img
                  src={imagePoster}
                  alt={`Backdrop`}
                  className="object-cover h-full xl:h-150"
                />            
            ):(     
              <>
              {/* <img
                  src={loading_img}
                  alt={`Loading image`}
                  className="object-cover h-full xl:h-150 opacity-0"
                /> */}
                <div className="skeleton-image absolute inset-0  z-10"></div>
              </>
            )
          }
          </div>
          <div className="w-full flex justify-center flex-col px-5 gap-3">
              <h1 className="md:text-6xl text-3xl">{movieDetails?.title}</h1>
              <div className="flex gap-7">
                <div className="flex gap-2">
                  {
                    movieDetails && (
                      <img src={star} alt="star" className="h-10"/>
                    )
                  }
                  <p>{movieDetails?.vote_average.toFixed(1)}</p>
                </div>
                <div>
                  <p className="text-gray-600">{movieDetails?.release_date?.slice(0, 4)}</p>
                </div>
              </div>
              <ul className="flex gap-3 flex-wrap">
                  {movieDetails &&
                    movieDetails.genres.map((genre, index) => (
                      <motion.li key={index} className="text-sm p-1 px-3 border-2 border-gray-400 rounded-xl text-gray-400 font-bold cursor-pointer"
                        whileTap={{scale:0.9}}
                        whileHover={{scale:1.1}}
                      >{genre.name}</motion.li>
                    ))
                  }
                </ul>
              <p className="text-base">
                {movieDetails?.overview}
              </p>
          </div>
        </div>


      <div className="flex xl:px-10 px-5 flex-col">
            {dataProviders?.flatrate && (
              <p className="text-white xl:text-3xl text-2xl font-bold mb-3">Where to watch</p>
            )}
            <div className="flex flex-wrap gap-5">
            {dataProviders?.flatrate?.map((provider, index) => (
                provider.provider_name !== "Netflix basic with Ads" && (
                    <motion.a 
                    key={index} 
                    href={dataProviders.link ?? undefined} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    whileTap={{scale:0.9}}
                    whileHover={{scale:1.1}}
                    >
                    <motion.img 
                        src={`https://image.tmdb.org/t/p/w500${provider.logo_path}`} 
                        alt={provider.provider_name} 
                        className="h-20 cursor-pointer rounded-2xl"
                        whileTap={{scale:0.9}}
                    />
                    </motion.a>
                )
                ))}
            </div>
      </div>

      <div className="flex flex-col gap-10 py-10">
        <MovieList items={movieDetails?.cast} title={"Casting"} person={true}/>
        <MovieList items={movieDetails?.recommendations} title={"Recommended movies"} person={false}/>
      </div>


    </div>
  );
}

export default MoviePage;
