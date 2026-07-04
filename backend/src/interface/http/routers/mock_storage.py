"""Router mock-storage — BE-04."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query, Response

from infrastructure.factories import get_object_storage, get_settings
from infrastructure.storage.in_memory import InMemoryObjectStorage

router = APIRouter(prefix="/v1/mock-storage", tags=["mock-storage"])


@router.get("/{path:path}")
async def serve_mock_storage(
    path: str,
    expires: int = Query(...),
) -> Response:
    settings = get_settings()
    if settings.STORAGE != "memory":
        raise HTTPException(status_code=404, detail="Not found")

    storage = get_object_storage(settings)
    if not isinstance(storage, InMemoryObjectStorage):
        raise HTTPException(status_code=404, detail="Not found")

    if not await storage.is_url_valid(path, expires):
        raise HTTPException(status_code=403, detail="URL expirada o inválida")

    data = await storage.get(path)
    if data is None:
        raise HTTPException(status_code=404, detail="Not found")

    content_type = await storage.get_content_type(path) or "application/octet-stream"
    return Response(content=data, media_type=content_type)
