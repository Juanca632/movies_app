import { useEffect, useState } from "react";
import "./MovieList.scss";
import Movie from "../Movie/Movie";
import { fetchData } from "../../hooks/API/API";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, Navigation, FreeMode } from 'swiper/modules';
import "swiper/swiper-bundle.css";

interface MovieListProps {
  endpoint: string;
  title: string;
  person: boolean;
}

interface MovieType {
  id: number;
  title: string;
  poster_path: string;
  name: string;
  profile_path: string;
  known_for_department: string;
}

function MovieList({ endpoint, title, person }: MovieListProps) {
  const [movies, setMovies] = useState<MovieType[]>([]);
  const [error, setError] = useState<string | null>(null); // State to manage error
  const [isMobile, setIsMobile] = useState(false);
  

  // useEffect will handle fetching the movies and retrying if necessary
  useEffect(() => {
    const fetchMovies = async () => {
      try {
        const data = await fetchData<MovieType[]>(endpoint);
        if (data) {
          setMovies(data);
          setError(null); // Clear any previous error if data is fetched successfully
        }
      } catch (error) {
        console.error("Error fetching movies:", error);
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
  }, [error]); // Dependency is the error, so the effect reruns when an error occurs

  useEffect(() => {
    // Function to update the state based on the window size
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768); // 768px is commonly used for mobile size
    };

    // Initial call and whenever the window size changes
    handleResize();
    window.addEventListener("resize", handleResize);

    // Cleanup the event listener on component unmount
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <div className="">
      <h1 className="text-white xl:text-3xl text-xl font-bold mb-3 xl:!px-10 !px-5">{title}</h1>
      {person ? (
        <Swiper
          slidesPerView={'auto'}
          spaceBetween={10}
          // freeMode={true}
          navigation={isMobile ? false : true}
          modules={[Autoplay, Navigation, FreeMode]}
          className="swiper w-full flex items-center justify-center xl:!px-10 !px-5"
        >
          {movies.length > 0 ? (
            movies
              .filter((movie) => movie.known_for_department === "Acting") // Filter out non-acting entries
              .map((movie) => (
                <SwiperSlide key={movie.id} className="sm:!w-[200px] sm:!h-[200px] !w-[150px] !h-[150px] ">
                  <Movie
                    title={movie.name}
                    imageUrl={`https://image.tmdb.org/t/p/w500${movie.profile_path}`}
                    person={true}
                    id={movie.id}
                  />
                </SwiperSlide>
              ))
          ) : (
            new Array(15).fill(null).map((_, index) => (
              <SwiperSlide key={index} className="sm:!w-[200px] sm:!h-[200px] !w-[150px] !h-[150px]">
                <Movie
                  title={""} // Empty title for "no data"
                  imageUrl={""} // Empty image for "no data"
                  person={true} // You can toggle between true or false depending on person view
                  id={0}
                />
              </SwiperSlide>
            ))
          )}
        </Swiper>
      ) : (
        <Swiper
          slidesPerView={'auto'}
          spaceBetween={10}
          // freeMode={true}
          navigation={isMobile ? false : true}
          modules={[Autoplay, Navigation]}
          className="swiper w-full flex items-center justify-center xl:!px-10 !px-5"
        >
          {movies.length > 0 ? (
            movies.map((movie) => (
              <SwiperSlide key={movie.id} className="sm:!w-[200px] sm:!h-[300px] !w-[133px] !h-[200px]">
                <Movie
                  title={movie.title ? movie.title : movie.name}
                  imageUrl={`https://image.tmdb.org/t/p/w500${movie.poster_path}`}
                  person={false}
                  id={movie.id}
                />
              </SwiperSlide>
            ))
          ) : (
            new Array(15).fill(null).map((_, index) => (
              <SwiperSlide key={index} className="sm:!w-[200px] sm:!h-[300px] !w-[133px] !h-[200px]">
                <Movie
                  title={""} // Empty title for "no data"
                  imageUrl={""} // Empty image for "no data"
                  person={false} // You can toggle between true or false depending on person view
                  id={0}
                />
              </SwiperSlide>
            ))
          )}
        </Swiper>
      )}
    </div>
  );
}

export default MovieList;
