import { useEffect, useState } from "react";
import "./MovieList.scss";
import Movie from "../Movie/Movie";
import { fetchData } from "../../hooks/API/API";
import { Swiper, SwiperSlide } from "swiper/react";
// import { Navigation } from 'swiper/modules'
import "swiper/swiper-bundle.css";

interface MovieListProps {
  endpoint: string;
  title: string;
}

interface MovieType {
  id: number;
  title: string;
  poster_path: string;
}

function MovieList({ endpoint, title }: MovieListProps) {
  const [movies, setMovies] = useState<MovieType[]>([]);
  const [numberSlides, setNumberSlides] = useState<number>(1)
  const [windowWidth, setWindowWidth] = useState<number>(window.innerWidth);

  useEffect(() => {
    const fetchMovies = async () => {
      try {
        const data = await fetchData<MovieType[]>(endpoint);
        console.log(data);

        if (data) {
          setMovies(data);
        }
      } catch (error) {
        console.error("Error fetching movies:", error);
      }
    };

    fetchMovies();
  }, []);

  useEffect(() => {
    const handleResize = () => {
      const newWidth = window.innerWidth; // Get the window width
      setWindowWidth(newWidth); // Update the windowWidth state
  
      // Calculate the number of slides based on the new width
      setNumberSlides(Math.floor(newWidth / 200)); 
    };
  
    // Call handleResize immediately to ensure correct values when the component mounts
    handleResize();
  
    // Listen for the resize event
    window.addEventListener("resize", handleResize);
  
    // Cleanup the event listener when the component unmounts
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [windowWidth]);  // This useEffect runs only once when the component mounts
  

  return (
    <div className="">
      <h1 className="text-white xl:text-3xl text-xl font-bold mb-3 xl:!px-10 !px-5">{title}</h1>
      <Swiper
        slidesPerView={numberSlides}
        spaceBetween={10}
        className="swiper w-full flex items-center justify-center xl:!px-10 !px-5"
        // modules={[Navigation]} // Include Navigation module
        // navigation={{ // Custom navigation buttons
        //   prevEl: ".swiper-button-prev", 
        //   nextEl: ".swiper-button-next",
        // }}
      >
        {movies.length > 0 ? (
          movies.map((movie) => (
            <SwiperSlide key={movie.id} className="swiper-slide">
              <Movie
                title={movie.title}
                imageUrl={`https://image.tmdb.org/t/p/w500${movie.poster_path}`}
              />
            </SwiperSlide>
          ))
        ) : (
          <p className="text-white">Loading...</p>
        )}
      </Swiper>
    </div>
  );
}

export default MovieList;
