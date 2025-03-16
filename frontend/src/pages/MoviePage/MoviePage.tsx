// import { useEffect, useState } from "react";
// import { fetchData } from "../../hooks/API/API";

import { useParams } from "react-router-dom";



// interface MovieType {
//     id: number;
//     title: string;
//     poster_path: string;
//     name: string;
//     profile_path: string;
//     known_for_department: string;
//   }

function MoviePage() {
    const { title, id } = useParams<{ title: string; id: string }>();
    // const [movies, setMovies] = useState<MovieType[]>([]);
    // const [error, setError] = useState<string | null>(null); // State to manage error

    //   // useEffect will handle fetching the movies and retrying if necessary
    //   useEffect(() => {
    //     const fetchMovies = async () => {
    //       try {
    //         const data = await fetchData<MovieType[]>(id);
    //         if (data) {
    //           setMovies(data);
    //           setError(null); // Clear any previous error if data is fetched successfully
    //         }
    //       } catch (error) {
    //         console.error("Error fetching movies:", error);
    //         setError("Error fetching data. Retrying..."); // Set an error message
    //       }
    //     };
    
    //     // Call immediately to try to fetch data when the component mounts
    //     fetchMovies();
    
    //     // If there is an error, retry fetching after 5 seconds
    //     const intervalId = setInterval(() => {
    //       if (error) {
    //         fetchMovies();
    //       }
    //     }, 5000); // Retry every 5 seconds
    
    //     // Cleanup the interval when the component is unmounted or when the fetch is successful
    //     return () => clearInterval(intervalId);
    //   }, [error]); // Dependency is the error, so the effect reruns when an error occurs

  return (
    <div className="min-h-screen w-full bg-zinc-900 text-4xl text-white">
        <p>id: {id}</p>
        <p>title: {title}</p>
    </div>
  )

}
export default MoviePage