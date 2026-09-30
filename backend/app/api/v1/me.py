from fastapi import APIRouter

from app.api.session import CurrentUserDep
from app.schemas.me import Profile

router = APIRouter(prefix="/me", tags=["Accounts"])


@router.get(
    "",
    summary="The signed-in user",
    description="401 when signed out; 503 when accounts are not set up, so the UI can hide "
    "sign-in altogether.",
)
async def me(user: CurrentUserDep) -> Profile:
    return Profile(name=user.name, email=user.email, avatar_url=user.avatar_url)
