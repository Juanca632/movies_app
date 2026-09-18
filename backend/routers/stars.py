from fastapi import APIRouter, status, Request

router = APIRouter()

@router.get(
    path="/trending/person/week",
    status_code=status.HTTP_200_OK,
    summary="Trending people",
    tags=["Stars"]
) 
async def get_upcoming_movies(request: Request):
    App = request.app.state.App
    return App.trending_people()

@router.get(
    path="/person/{person_id}",
    status_code=status.HTTP_200_OK,
    summary="Details of a star",
    tags=["Stars"]
) 
async def get_details_tv(request: Request, person_id: str):
    App = request.app.state.App
    return App.details_people(person_id)

@router.get(
    path="/person/{person_id}/movies",
    status_code=status.HTTP_200_OK,
    summary="",
    tags=["Stars"]
) 
async def get_movie_credits_people(request: Request, person_id: str):
    App = request.app.state.App
    return App.movie_credits_people(person_id)

@router.get(
    path="/person/{person_id}/tv-shows",
    status_code=status.HTTP_200_OK,
    summary="",
    tags=["Stars"]
) 
async def get_tv_credits_people(request: Request, person_id: str):
    App = request.app.state.App
    return App.tv_credits_people(person_id)