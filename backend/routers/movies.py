from fastapi import APIRouter, Request, status

router = APIRouter()


@router.get(
    path="/movie/popular",
    status_code=status.HTTP_200_OK,
    summary="Popular movies",
    tags=["Movies"]
) 
async def get_popular_movies(
    request: Request,
):
    App = request.app.state.App 
    return App.popular_movies()


@router.get(
    path="/movie/top_rated",
    status_code=status.HTTP_200_OK,
    summary="Top rated",
    tags=["Movies"]
) 
async def get_top_rated_movies(
    request: Request,
):
    App = request.app.state.App 
    return App.top_rated_movies()

@router.get(
    path="/movie/upcoming",
    status_code=status.HTTP_200_OK,
    summary="Upcoming movies",
    tags=["Movies"]
) 
async def get_upcoming_movies(
    request: Request,
):
    App = request.app.state.App 
    return App.upcoming_movies()

@router.get(
    path="/movie/now_playing",
    status_code=status.HTTP_200_OK,
    summary="Now playing movies",
    tags=["Movies"]
) 
async def get_now_playing_movies(
    request: Request,
):
    App = request.app.state.App 
    return App.now_playing()

@router.get(
    path="/movies/{movie_id}/images",
    status_code=status.HTTP_200_OK,
    summary="Movies images",
    tags=["Movies"]
) 
async def get_images_movies(request: Request, movie_id: str):
    App = request.app.state.App
    return App.images_movie(movie_id)

@router.get(
    path="/movies/{movie_id}/recommendations",
    status_code=status.HTTP_200_OK,
    summary="Recommended movies",
    tags=["Movies"]
) 
async def get_recommended_movies(request: Request, movie_id: str):
    App = request.app.state.App
    return App.recommended_movies(movie_id)

@router.get(
    path="/movies/{movie_id}/credits",
    status_code=status.HTTP_200_OK,
    summary="Credits of movies",
    tags=["Movies"]
) 
async def get_credits_movies(request: Request, movie_id: str):
    App = request.app.state.App
    return App.credits_movies(movie_id)

@router.get(
    path="/movies/{movie_id}/providers",
    status_code=status.HTTP_200_OK,
    summary="Providers",
    tags=["Movies"]
) 
async def get_providers_movies(request: Request, movie_id: str):
    App = request.app.state.App
    return App.watch_providers(movie_id)

@router.get(
    path="/movies/{movie_id}",
    status_code=status.HTTP_200_OK,
    summary="Details of single movie",
    tags=["Movies"]
) 
async def get_details_movie(request: Request, movie_id: str):
    App = request.app.state.App
    return App.details_movies(movie_id)