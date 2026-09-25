from fastapi import APIRouter

from app.api.deps import MediaServiceDep
from app.schemas.media import Collection

router = APIRouter(prefix="/collection", tags=["Media"])


@router.get("/{collection_id}", summary="A movie saga with its parts in release order")
async def get_collection(collection_id: int, service: MediaServiceDep) -> Collection:
    return await service.collection(collection_id)
