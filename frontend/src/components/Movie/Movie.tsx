import { motion } from "framer-motion";
import { useState, useEffect, useRef } from "react";
import "./Movie.scss";
import { useNavigate } from "react-router-dom"; 

interface MovieProps {
  title: string;
  imageUrl: string;
  person: boolean;
  id: number;
}

function Movie({ title, imageUrl, person, id }: MovieProps) {
  const isLoading = !title && !imageUrl;
  const [isVisible, setIsVisible] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false); 
  const ref = useRef<HTMLDivElement>(null);

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

  const navigate = useNavigate();
  const goToMoviePage = () => {
    navigate(`${id}/${title}`);
  };

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
        <motion.div className="movie rounded-xl relative h-full w-full" whileHover={{ scale: 1, zIndex: 10 }} whileTap={{ scale: 0.9 }}>
          <img src={imageUrl} alt={title} className="h-full w-full rounded-full object-cover" />
          <motion.div
            className="absolute bg-gradient-to-t from-black to-transparent w-full h-full top-0 right-0 bottom-0 left-0 z-20 rounded-full"
            initial={{ opacity: 0 }}
            whileHover={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            <div className="h-full w-full flex items-end justify-center p-2 pb-5">
              <p className="text-white text-xl text-center w-3/5">{title}</p>
            </div>
          </motion.div>
        </motion.div>
      ) : (
        // Regular movie content
        <motion.div className="movie rounded-xl relative h-full" whileHover={{ scale: 1, zIndex: 10 }} whileTap={{ scale: 0.9 }}>
          <img src={imageUrl} alt={title} className="rounded-md h-full" />
          <motion.div
            className="absolute bg-gradient-to-t from-black to-transparent w-full h-full top-0 right-0 bottom-0 left-0 z-20 rounded-md"
            initial={{ opacity: 0 }}
            whileHover={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            onClick={goToMoviePage}
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
