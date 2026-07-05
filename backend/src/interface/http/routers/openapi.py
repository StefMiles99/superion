"""Router OpenAPI explícito — BE-08."""

from __future__ import annotations

from fastapi import APIRouter, Request

router = APIRouter(tags=["openapi"])


@router.get("/openapi.json")
async def openapi_json(request: Request) -> dict[str, object]:
    return request.app.openapi()
