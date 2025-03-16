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
    tags=["Popular movies"]
) 
async def get_popular_movies():
    return main_thread.popular_movies()


@app.get(
    path="/movie/top_rated",
    status_code=status.HTTP_200_OK,
    summary="Top rated",
    tags=["Top rated"]
) 
async def get_top_rated_movies():
    return main_thread.top_rated_movies()



@app.get(
    path="/movie/upcoming",
    status_code=status.HTTP_200_OK,
    summary="Upcoming movies",
    tags=["Upcoming movies"]
) 
async def get_upcoming_movies():
    return main_thread.upcoming_movies()

@app.get(
    path="/movie/now_playing",
    status_code=status.HTTP_200_OK,
    summary="Now playing movies",
    tags=["Now playing movies"]
) 
async def get_upcoming_movies():
    return main_thread.now_playing()

@app.get(
    path="/trending/person/week",
    status_code=status.HTTP_200_OK,
    summary="Trending people",
    tags=["Trending people"]
) 
async def get_upcoming_movies():
    return main_thread.trending_people()

@app.get(
    path="/tv/popular",
    status_code=status.HTTP_200_OK,
    summary="Popular TV shows",
    tags=["Popular TV shows"]
) 
async def get_upcoming_movies():
    return main_thread.popular_tv()

@app.get(
    path="/tv/top_rated",
    status_code=status.HTTP_200_OK,
    summary="Top rated TV shows",
    tags=["Top rated TV shows"]
) 
async def get_upcoming_movies():
    return main_thread.top_rated_tv()

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


