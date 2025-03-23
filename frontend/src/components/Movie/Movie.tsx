import { motion } from "framer-motion";
import { useState, useEffect, useRef } from "react";
import "./Movie.scss";
import user from "../../assets/user.svg"


interface MovieProps {
  title: string;
  imageUrl: string;
  person: boolean;
  id: number;
  goToPage: (id: number, title: string) => void;
}

function Movie({ title, imageUrl, person, id, goToPage }: MovieProps) {
  const [isLoading, setIsLoading] = useState<boolean>(!title);
  const [isVisible, setIsVisible] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false); 
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof title !== "string" || title.trim() === "") {
      setIsLoading(true);
    } else {
      setIsLoading(false);
    }
  }, [title]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasLoaded) {
          setIsVisible(true);
          setHasLoaded(true); // Set as loaded
        }
      },
      { threshold: 0.1 }
    );

    if (ref.current) observer.observe(ref.current);

    return () => observer.disconnect();
  }, [hasLoaded]); 


  return (
    <div className="h-full w-full" ref={ref}>
      {isLoading || !isVisible ? (
        // Skeleton loader for no data
        person ? (
          <motion.div className="movie movie-loading skeleton rounded-full relative bg-zinc-700 h-full">
            {/* Skeleton loader for person */}
            <div className="skeleton-image rounded-full"></div>
            <div className="skeleton-text mx-auto mt-2"></div>
          </motion.div>
        ) : (
          <motion.div className="movie movie-loading skeleton rounded-xl relative bg-zinc-700 h-full">
            {/* Skeleton loader for movie */}
            <div className="skeleton-image rounded-xl"></div>
            <div className="skeleton-text mx-auto mt-2"></div>
          </motion.div>
        )
      ) : person ? (
        // Regular person content
        
        <motion.div className={`movie ${imageUrl == "https://image.tmdb.org/t/p/w500null" ? "movie-loading skeleton" : ""} rounded-full relative h-full w-full flex justify-center items-center bg-zinc-800`} whileHover={{ scale: 1, zIndex: 10 }} whileTap={{ scale: 0.9 }}>
          <img src={imageUrl == "https://image.tmdb.org/t/p/w500null" ? user : imageUrl} alt={title} className={`h-full w-full rounded-full object-cover ${imageUrl == "https://image.tmdb.org/t/p/w500null" ? "!rounded-none flex justify-center items-center !h-3/4 !w-3/4" : ""}`} />
          {/* <div className={` h-full w-full rounded-full object-cover ${imageUrl == "https://image.tmdb.org/t/p/w500null" ? "skeleton-image" : "hidden"}`}></div> */}
          <motion.div
            className="absolute bg-gradient-to-t from-black to-transparent w-full h-full top-0 right-0 bottom-0 left-0 z-20 rounded-full"
            initial={{ opacity: 0 }}
            whileHover={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            <div className="h-full w-full flex items-end justify-center p-2 pb-5">
              <p className="text-white text-xl text-center w-3/5 break-words ">{title}</p>
            </div>
          </motion.div>
        </motion.div>
      ) : (
        // Regular movie content
        <motion.div className={`movie ${imageUrl == "https://image.tmdb.org/t/p/w500null" ? "movie-loading skeleton" : ""} rounded-xl relative h-full`} whileHover={{ scale: 1, zIndex: 10 }} whileTap={{ scale: 0.9 }}>
          <img src={imageUrl} alt={title} className={`rounded-md h-full ${imageUrl == "https://image.tmdb.org/t/p/w500null" ? "hidden" : ""}`} />
          <div className={` rounded-md h-full ${imageUrl == "https://image.tmdb.org/t/p/w500null" ? "skeleton-image" : "hidden"}`}></div>
          <motion.div
            className="absolute bg-gradient-to-t from-black to-transparent w-full h-full top-0 right-0 bottom-0 left-0 z-20 rounded-md"
            initial={{ opacity: 0 }}
            whileHover={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            onClick={() => goToPage(id,title)}
          >
            <div className="h-full w-full flex items-end p-2">
              <p className="text-white text-xl text-center w-full">{title}</p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}

export default Movie;
