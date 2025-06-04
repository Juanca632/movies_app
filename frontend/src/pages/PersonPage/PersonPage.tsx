import { useEffect, useState } from "react";
import { fetchData } from "../../hooks/API/API";
import { useParams } from "react-router-dom";
import MovieList from "../../components/MovieList/MovieList";
// import loading_img from "../../assets/loading_banner_img.jpg"
import TvShowList from "../../components/TvShowList/TvShowList";


interface PersonDetails {
  adult: boolean;
  biography: string;
  name: boolean;
  place_of_birth: string;
  profile_path: string;  
}

function PersonPage() {
  const { id } = useParams<{ title: string; id: string }>();
  const [personDetails, setPersonDetails] = useState<PersonDetails | null>(null) 
  const [error, setError] = useState<string | null>(null); // State to manage error


  useEffect(() => {
      window.scrollTo(0, 0); 
  }, [id]);

  // useEffect will handle fetching the movie and retrying if necessary
  useEffect(() => {
    const fetchMovies = async () => {
      try {
        const detailsPerson = await fetchData<PersonDetails>(`person/${id}`);
        if (detailsPerson) {
          setPersonDetails(detailsPerson)
          setError(null);
        }

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

  return (
    <div className="min-h-screen w-full bg-zinc-900 text-4xl text-white md:py-10 py-0">
        <div className="grid xl:grid-cols-[auto_1fr] xl:grid-rows-[auto] xl:gap-20 gap-5 grid-cols-[auto] grid-rows-[auto-auto]  w-full md:py-5 pb-5 md:px-10 px-0 relative">
          <div className="relative flex justify-center items-center">
            {personDetails?.profile_path ? (
                <img
                  src={`https://image.tmdb.org/t/p/w500${personDetails?.profile_path}`}
                  alt={"profile_path"}
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
              <h1 className="md:text-6xl text-3xl">{personDetails?.name}</h1>
              <div className="flex gap-7">
                <div>
                  <p className="text-gray-600">{personDetails?.place_of_birth}</p>
                </div>
              </div>
              <p className="text-base md:text-xl">
                {personDetails?.biography &&
                personDetails?.biography
                    ?.split(".")
                    .slice(0, 10)
                    .join(".") + (personDetails?.biography.split(".").length > 3 ? "." : "")}
                </p>

          </div>
        </div>

      <div className="flex flex-col gap-10 py-10">
        <MovieList endpoint={`person/${id}/movies`} title={"Movies"} person={false}/>
        <TvShowList endpoint={`person/${id}/tv-shows`} title={"TV shows"} person={false}/>
      </div>


    </div>
  );
}

export default PersonPage;
