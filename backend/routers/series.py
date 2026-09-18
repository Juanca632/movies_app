from fastapi import APIRouter, Request, status

router = APIRouter()

@router.get(
    path="/tv/popular",
    status_code=status.HTTP_200_OK,
    summary="Popular TV shows",
    tags=["TV shows"]
) 
async def get_popular_tv(
    request: Request,
):
    App = request.app.state.App
    return App.popular_tv()

@router.get(
    path="/tv/top_rated",
    status_code=status.HTTP_200_OK,
    summary="Top rated TV shows",
    tags=["TV shows"]
) 
async def get_top_rated_tv(
    request: Request,
):
    App = request.app.state.App
    return App.top_rated_tv()

@router.get(
    path="/tv/{tv_id}/recommendations",
    status_code=status.HTTP_200_OK,
    summary="Recommended Tv Shows",
    tags=["TV shows"]
) 
async def get_recommended_tv(request: Request, tv_id: str):
    App = request.app.state.App
    return App.recommended_tv(tv_id)

@router.get(
    path="/tv/{tv_id}/credits",
    status_code=status.HTTP_200_OK,
    summary="Credits of Tv Shows",
    tags=["TV shows"]
) 
async def get_credits_tv(request: Request, tv_id: str):
    App = request.app.state.App
    return App.credits_tv(tv_id)

@router.get(
    path="/tv/{tv_id}/images",
    status_code=status.HTTP_200_OK,
    summary="Tv shows images",
    tags=["TV shows"]
) 
async def get_images_tv(request: Request, tv_id: str):
    App = request.app.state.App
    return App.images_tv(tv_id)

@router.get(
    path="/tv/{tv_id}/providers",
    status_code=status.HTTP_200_OK,
    summary="Providers TV shows",
    tags=["TV shows"]
) 
async def get_providers_tv(request: Request, tv_id: str):
    App = request.app.state.App
    return App.watch_providers_tv(tv_id)

@router.get(
    path="/tv/{tv_id}",
    status_code=status.HTTP_200_OK,
    summary="Details of single TV show",
    tags=["TV shows"]
) 
async def get_details_tv(request: Request, tv_id: str):
    App = request.app.state.App
    return App.details_tv(tv_id)