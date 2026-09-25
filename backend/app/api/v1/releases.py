from typing import Annotated

from fastapi import APIRouter, Query

from app.api.deps import ReleasesServiceDep
from app.schemas.media import MediaSummary
from app.services.releases import ReleaseKind

router = APIRouter(prefix="/releases", tags=["Discover"])


@router.get("/{kind}", summary="A month's releases in theaters, at home or new TV series")
async def list_releases(
    kind: ReleaseKind,
    service: ReleasesServiceDep,
    month: Annotated[str, Query(pattern=r"^\d{4}-(0[1-9]|1[0-2])$")],
    region: Annotated[str, Query(pattern="^[A-Z]{2}$")] = "US",
) -> list[MediaSummary]:
    """Movies carry their release date in `region`; TV series their premiere date."""
    return await service.month(kind, month, region)
