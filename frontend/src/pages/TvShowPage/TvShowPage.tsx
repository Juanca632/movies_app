import { useEffect, useState } from "react";
import { fetchData } from "../../hooks/API/API";
import { useParams } from "react-router-dom";
import { motion } from "framer-motion";
import loading_img from "../../assets/loading_banner_img.jpg"
import star from "../../assets/star.png"
import TvShowList from "../../components/TvShowList/TvShowList";

interface MovieImage {
  aspect_ratio: number;
  file_path: string;
  height: number;
  width: number;
  vote_average: number;
  vote_count: number;
  iso_639_1: string
}

interface DataType {
  backdrops: MovieImage[];
  posters: MovieImage[];
}

interface FlatrateType{
  logo_path: string;
  provider_name: string;
}

interface ProvidersType{
  link: string;
  flatrate: FlatrateType[];
}

interface TvShowsDetails {
  name: string;
  vote_average: number;
  genres: { id: number; name: string }[];
  overview: string;
  number_of_seasons: number;
  number_of_episodes: number;
  poster_path: string;
}

function TvShowPage() {
  const { id } = useParams<{ title: string; id: string }>();
  const [dataImage, setDataImage] = useState<DataType | null>(null);
  const [dataProviders, setDataProviders] = useState<ProvidersType | null>(null);
  const [tvShowDetails, setTvShowDetails] = useState<TvShowsDetails | null>(null) 
  const [error, setError] = useState<string | null>(null); // State to manage error
  const [imagePoster, setImagePoster] =  useState<string | null>(null);


  useEffect(() => {
      window.scrollTo(0, 0); 
      setDataImage(null);
      setDataProviders(null);
  }, [id]);


  useEffect(() => {
    if (dataImage && dataImage.posters.length > 0) {
      const selectedImage = findImageEnglish(dataImage.posters);
      if (selectedImage) {
        setImagePoster(`https://image.tmdb.org/t/p/w500${selectedImage.file_path}`);
      }
    }
  }, [dataImage?.posters]); 

  // useEffect will handle fetching the movie and retrying if necessary
  useEffect(() => {
    const fetchMovies = async () => {
      try {
        const data = await fetchData<DataType>(`tv/${id}/images`); // Ensure the correct endpoint
        if (data) {
          setDataImage(data);
          setError(null); // Clear any previous error if data is fetched successfully
        }

        const providers = await fetchData<ProvidersType>(`tv/${id}/providers`);
        if (providers) {
          setDataProviders(providers)
          setError(null);
        }

        const DetailsTvShow = await fetchData<TvShowsDetails>(`tv/${id}/`);
        if (DetailsTvShow) {
          setTvShowDetails(DetailsTvShow)
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

  // Find the first image with aspect_ratio 1.778
  // const findImageWithAspectRatio = (images: MovieImage[]) => {
  //   return images.find((image) => image.aspect_ratio === 1.778);
  // };

  const findImageEnglish = (images: MovieImage[]) => {
    const englishImages = images.filter((image) => image.iso_639_1 === "en");
  
    if (englishImages.length === 1) {
      return englishImages[0]; 
    } else if (englishImages.length > 1) {
      const randomIndex = Math.floor(Math.random() * (englishImages.length - 1)) + 1;
      return englishImages[randomIndex];
    }
  
    return null; 
  };

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
              <img
                  src={loading_img}
                  alt={`Loading image`}
                  className="object-cover h-full xl:h-150"
                />
                <div className="skeleton-image absolute inset-0  z-10"></div>
              </>
            )
          }
          </div>
          <div className="w-full flex justify-center flex-col px-5 gap-3">
              <h1 className="md:text-6xl text-3xl">{tvShowDetails?.name}</h1>
              <div className="flex gap-7">
                <div className="flex gap-2">
                  {
                    tvShowDetails && (
                      <img src={star} alt="star" className="h-10"/>
                    )
                  }
                  <p>{tvShowDetails?.vote_average.toFixed(1)}</p>
                </div>
                <div>
                  <p className="text-gray-600">{}</p>
                </div>
              </div>
                {
                    tvShowDetails && (
                  <div className="flex gap-5">
                    <p className="text-gray-600 text-xl font-bold">{tvShowDetails?.number_of_episodes} episodes</p>
                    <p className="text-gray-600 text-xl font-bold">{tvShowDetails?.number_of_seasons} seasons</p>
                  </div>
                    )
                  }
              <ul className="flex gap-3 flex-wrap">
                  {tvShowDetails &&
                    tvShowDetails.genres.map((genre, index) => (
                      <motion.li key={index} className="text-sm p-1 px-3 border-2 border-gray-400 rounded-xl text-gray-400 font-bold cursor-pointer"
                        whileTap={{scale:0.9}}
                        whileHover={{scale:1.1}}
                      >{genre.name}</motion.li>
                    ))
                  }
                </ul>
              <p className="text-base">
                {tvShowDetails?.overview}
              </p>
          </div>
        </div>
    

      <div className="flex xl:px-10 px-5 flex-col">
            {dataProviders?.flatrate && (
              <p className="text-white xl:text-3xl text-2xl font-bold mb-3">Providers</p>
            )}
            <div className="flex gap-5">
            {dataProviders?.flatrate?.map((provider, index) => (
                provider.provider_name !== "Netflix basic with Ads" && (
                  <motion.a 
                  key={index} 
                  href={dataProviders.link} 
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
        <TvShowList endpoint={`tv/${id}/credits`} title={"Casting"} person={true}/>
        <TvShowList endpoint={`tv/${id}/recommendations`} title={"Recommended TV shows"} person={false}/>
      </div>


    </div>
  );
}

export default TvShowPage;
