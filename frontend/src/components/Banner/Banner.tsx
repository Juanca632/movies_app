import { useState, useEffect } from "react";
import { fetchData } from "../../hooks/API/API";
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, Pagination, Navigation } from 'swiper/modules';
import "./Banner.scss";
import "swiper/swiper-bundle.css";
import star from "../../assets/star.png";
import { motion } from "framer-motion";

interface MovieType {
  id: number;
  title: string;
  poster_path: string;
  vote_average: number;
  overview: string;
  release_date: string;
}

function Banner() {
  const [movies, setMovies] = useState<MovieType[]>([]);
  const [error, setError] = useState<string | null>(null); // State to manage errors

  useEffect(() => {
    const fetchMovies = async () => {
      try {
        const data = await fetchData<MovieType[]>("movie/popular");
        if (data) {
          setMovies(data);
          setError(null); // Clear any previous errors if fetch is successful
        }
      } catch (error) {
        console.error("Error fetching movies:", error);
        setError("Error fetching data. Retrying..."); // Set error message
      }
    };

    // Initial fetch
    fetchMovies();

    // Retry fetching if there's an error, every 5 seconds
    const intervalId = setInterval(() => {
      if (error) {
        fetchMovies();
      }
    }, 5000); // Retry every 5 seconds

    // Clean up the interval when the component is unmounted or the fetch is successful
    return () => clearInterval(intervalId);
  }, [error]); // The dependency is error, so the effect reruns when an error occurs

  const truncateText = (text: string, wordLimit: number) => {
    if (!text) return "";
    const words = text.split(" ");
    return words.length > wordLimit ? words.slice(0, wordLimit).join(" ") + "..." : text;
  };
  

  return (
    <Swiper
      spaceBetween={5}
      slidesPerGroup={1}
      centeredSlides={true}
      autoplay={{
        delay: 6000,
        disableOnInteraction: false,
      }}
      navigation={true}
      modules={[Autoplay, Pagination, Navigation]}
      className="mySwiper"
    >
      {movies.length > 0 ? (
        movies.map((movie) => (
          <SwiperSlide key={movie.id} className="!w-full !flex !justify-center !items-center 2xl:!h-130 md:!h-100 !h-160 !pt-10">
            <div className="md:w-4/5 w-5/5 h-full grid md:grid-cols-[auto_1fr] grid-rows-[auto_1fr] md:gap-10 gap-2">
              <div className="2xl:!h-130 md:!h-100 !h-130">
                <motion.img src={`https://image.tmdb.org/t/p/w500${movie.poster_path}`} className="h-full w-full object-contain" whileTap={{scale:0.95}}/>
              </div>
              <div className="grid grid-rows-[35%_1fr]  md:gap-5 gap-2 md:pl-0 pl-5">
                <div className="flex items-end">
                  <span className=" 2xl:text-6xl xl:text-4xl md:text-2xl text-xl font-bold">{movie.title}</span>
                </div>
                <div className="flex flex-col gap-10 w-full">
                  <div className="flex items-center gap-5">
                    <img src={star} className="sm:w-10 w-7" />
                    <span className="md:text-3xl text-lg">{movie.vote_average.toFixed(2)}/10</span>
                    <span className="md:text-3xl text-lg text-gray-500">{movie.release_date?.slice(0, 4)}</span>
                  </div>
                  <div>
                  <p className="md:text-sm xl:text-lg 3xl:text-xl text-sm text-gray-300 hidden md:block">
                    {truncateText(movie.overview, 50)} 
                  </p>
                  </div>
                </div>
              </div>
            </div>
          </SwiperSlide>
        ))
      ) : ( null
      //   <div  className="w-full flex !justify-center items-center 2xl:!h-130 md:!h-100 !h-160 ">
      //   <div className="md:w-4/5 w-full h-full grid md:grid-cols-[1fr_1fr] grid-rows-[1fr_auto] md:gap-10 md:p-0 p-5">
      //     <div className="2xl:h-full">
      //       <div className="h-full w-full p-5 skeleton-image"/>
      //     </div>
      //     <div className="grid grid-rows-2 gap-10">
      //       <div className="flex items-end ">
      //         <span className=" w-2/5 !h-12 skeleton-image"></span>
      //       </div>
      //       <div className="flex flex-col gap-5">
      //         <span className="w-4/5 !h-6 skeleton-image"></span>
      //         <span className="w-2/5 !h-6 skeleton-image bg-blue-900"></span>
      //         <span className="w-3/5 !h-6 skeleton-image bg-blue-900"></span>
      //       </div>
      //     </div>
      //   </div>
      // </div>
      )}
    </Swiper>
  );
}

export default Banner;
