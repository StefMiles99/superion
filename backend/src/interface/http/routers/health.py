"""Router de health — BE-00/BE-08."""

from __future__ import annotations

import json

from fastapi import APIRouter, Depends, Response

from application.use_cases.health import HealthCheck
from application.use_cases.readiness import ReadinessCheck
from infrastructure.config import Settings
from infrastructure.factories import get_settings

router = APIRouter(tags=["health"])


def get_health_check(settings: Settings = Depends(get_settings)) -> HealthCheck:
    return HealthCheck(version=settings.APP_VERSION)


def get_readiness_check(settings: Settings = Depends(get_settings)) -> ReadinessCheck:
    return ReadinessCheck(settings=settings)


@router.get("/health")
async def health(health_check: HealthCheck = Depends(get_health_check)) -> dict[str, object]:
    return await health_check.execute()


@router.get("/ready")
async def ready(readiness: ReadinessCheck = Depends(get_readiness_check)) -> Response:
    ok, checks = await readiness.execute()
    body = {"status": "ready" if ok else "not_ready", "checks": checks}
    status_code = 200 if ok else 503
    return Response(
        content=json.dumps(body),
        status_code=status_code,
        media_type="application/json",
    )
