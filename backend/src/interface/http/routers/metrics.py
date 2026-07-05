"""Router de métricas Prometheus — BE-08."""

from __future__ import annotations

from fastapi import APIRouter, Depends, Response

from infrastructure.factories import get_metrics_collector

router = APIRouter(tags=["metrics"])


@router.get(
    "/metrics",
    responses={200: {"content": {"text/plain": {"schema": {"type": "string"}}}}},
)
async def metrics(collector=Depends(get_metrics_collector)) -> Response:
    body = collector.render_prometheus()
    return Response(content=body, media_type="text/plain; version=0.0.4; charset=utf-8")
