"""Router de health — BE-00."""

from __future__ import annotations

from fastapi import APIRouter, Depends

from application.use_cases.health import HealthCheck
from infrastructure.config import Settings
from infrastructure.factories import get_settings

router = APIRouter(tags=["health"])


def get_health_check(settings: Settings = Depends(get_settings)) -> HealthCheck:
    return HealthCheck(version=settings.APP_VERSION)


@router.get("/health")
async def health(health_check: HealthCheck = Depends(get_health_check)) -> dict[str, object]:
    return await health_check.execute()


@router.get("/ready")
async def ready() -> dict[str, str]:
    return {"status": "ready"}
