from fastapi import FastAPI, status 
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from contextlib import asynccontextmanager
from main_thread import MainThread

main_thread = MainThread()

@asynccontextmanager
async def lifespan(app: FastAPI):
    try:    
        print("Application is beginning...")
        main_thread.start()  # Start the thread
        print("Application is starting up...")
        yield  # This is where the app runs
    finally:
        print("Application is shutting down...")
        main_thread.stop_thread()


app = FastAPI(lifespan=lifespan)
# CORS configuration
origins = ["*"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

### ENDPOINTS ###

@app.get(
    path="/movie/popular",
    status_code=status.HTTP_200_OK,
    summary="Popular movies",
    tags=["Movies"]
) 
async def get_popular_movies():
    return main_thread.popular_movies()


@app.get(
    path="/movie/top_rated",
    status_code=status.HTTP_200_OK,
    summary="Top rated",
    tags=["Movies"]
) 
async def get_top_rated_movies():
    return main_thread.top_rated_movies()

@app.get(
    path="/movie/upcoming",
    status_code=status.HTTP_200_OK,
    summary="Upcoming movies",
    tags=["Movies"]
) 
async def get_upcoming_movies():
    return main_thread.upcoming_movies()

@app.get(
    path="/movie/now_playing",
    status_code=status.HTTP_200_OK,
    summary="Now playing movies",
    tags=["Movies"]
) 
async def get_upcoming_movies():
    return main_thread.now_playing()

@app.get(
    path="/trending/person/week",
    status_code=status.HTTP_200_OK,
    summary="Trending people",
    tags=["Stars"]
) 
async def get_upcoming_movies():
    return main_thread.trending_people()

@app.get(
    path="/tv/popular",
    status_code=status.HTTP_200_OK,
    summary="Popular TV shows",
    tags=["TV shows"]
) 
async def get_upcoming_movies():
    return main_thread.popular_tv()

@app.get(
    path="/tv/top_rated",
    status_code=status.HTTP_200_OK,
    summary="Top rated TV shows",
    tags=["TV shows"]
) 
async def get_upcoming_movies():
    return main_thread.top_rated_tv()

@app.get(
    path="/movies/{movie_id}/images",
    status_code=status.HTTP_200_OK,
    summary="Movies images",
    tags=["Movies"]
) 
async def get_images_movies(movie_id: str):
    return main_thread.images_movie(movie_id)

@app.get(
    path="/movies/{movie_id}/recommendations",
    status_code=status.HTTP_200_OK,
    summary="Recommended movies",
    tags=["Movies"]
) 
async def get_recommended_movies(movie_id: str):
    return main_thread.recommended_movies(movie_id)

@app.get(
    path="/movies/{movie_id}/credits",
    status_code=status.HTTP_200_OK,
    summary="Credits of movies",
    tags=["Movies"]
) 
async def get_credits_movies(movie_id: str):
    return main_thread.credits_movies(movie_id)

@app.get(
    path="/movies/{movie_id}/providers",
    status_code=status.HTTP_200_OK,
    summary="Providers",
    tags=["Movies"]
) 
async def get_providers_movies(movie_id: str):
    return main_thread.watch_providers(movie_id)

@app.get(
    path="/tv/{tv_id}/recommendations",
    status_code=status.HTTP_200_OK,
    summary="Recommended Tv Shows",
    tags=["TV shows"]
) 
async def get_recommended_tv(tv_id: str):
    return main_thread.recommended_tv(tv_id)

@app.get(
    path="/tv/{tv_id}/credits",
    status_code=status.HTTP_200_OK,
    summary="Credits of Tv Shows",
    tags=["TV shows"]
) 
async def get_credits_tv(tv_id: str):
    return main_thread.credits_tv(tv_id)

@app.get(
    path="/tv/{tv_id}/images",
    status_code=status.HTTP_200_OK,
    summary="Tv shows images",
    tags=["TV shows"]
) 
async def get_images_tv(tv_id: str):
    return main_thread.images_tv(tv_id)

@app.get(
    path="/tv/{tv_id}/providers",
    status_code=status.HTTP_200_OK,
    summary="Providers TV shows",
    tags=["TV shows"]
) 
async def get_providers_tv(tv_id: str):
    return main_thread.watch_providers_tv(tv_id)

@app.get(
    path="/movies/{movie_id}",
    status_code=status.HTTP_200_OK,
    summary="Details of single movie",
    tags=["Movies"]
) 
async def get_details_movie(movie_id: str):
    return main_thread.details_movies(movie_id)

@app.get(
    path="/tv/{tv_id}",
    status_code=status.HTTP_200_OK,
    summary="Details of single TV show",
    tags=["TV shows"]
) 
async def get_details_tv(tv_id: str):
    return main_thread.details_tv(tv_id)

@app.get(
    path="/person/{person_id}",
    status_code=status.HTTP_200_OK,
    summary="Details of a star",
    tags=["Stars"]
) 
async def get_details_tv(person_id: str):
    return main_thread.details_people(person_id)

@app.get(
    path="/person/{person_id}/movies",
    status_code=status.HTTP_200_OK,
    summary="",
    tags=["Stars"]
) 
async def get_movie_credits_people(person_id: str):
    return main_thread.movie_credits_people(person_id)

@app.get(
    path="/person/{person_id}/tv-shows",
    status_code=status.HTTP_200_OK,
    summary="",
    tags=["Stars"]
) 
async def get_tv_credits_people(person_id: str):
    return main_thread.tv_credits_people(person_id)



# @app.get(
#     path="/search/movie?query={movie_name}",
#     status_code=status.HTTP_200_OK,
#     summary="Search movie by name",
#     tags=["Search movie by name"]
# ) 
# async def get_upcoming_movies(movie_id: int):
#     return {"data":"test"}

# @app.get(
#     path="/movie/{movie_id}",
#     status_code=status.HTTP_200_OK,
#     summary="Search movie by ID",
#     tags=["Search movie by ID"]
# ) 
# async def get_upcoming_movies(movie_id: int):
#     return {"data":"test"}

# @app.get(
#     path="/discover/movie?primary_release_year={year}&with_genres={genre_ID}",
#     status_code=status.HTTP_200_OK,
#     summary="Search movie",
#     tags=["Upcoming movies"]
# ) 
# async def get_upcoming_movies():
#     return {"data":"test"}


