from typing import Annotated

from fastapi import APIRouter, Path

from app.api.deps import AcclaimServiceDep
from app.schemas.media import Acclaim

router = APIRouter(prefix="/acclaim", tags=["Acclaim"])


@router.get("/{imdb_id}", summary="Awards and critic scores for an IMDb title")
async def get_acclaim(
    imdb_id: Annotated[str, Path(pattern=r"^tt\d{5,10}$")], service: AcclaimServiceDep
) -> Acclaim:
    # Always 200: an empty result just means there is nothing to show.
    return await service.get(imdb_id)
