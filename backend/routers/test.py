from fastapi import APIRouter, Request, status

router = APIRouter()

@router.get(
    path="/test",
    status_code=status.HTTP_200_OK,
    summary="Test",
    tags=["Test"]
) 
async def test(request: Request):
    App = request.app.state.App
    return True