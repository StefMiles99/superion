"""Tests de endpoint /metrics — BE-08."""

import pytest
from httpx import ASGITransport, AsyncClient

from infrastructure.config import Settings
from infrastructure.observability.metrics import InMemoryMetricsCollector
from interface.main import create_app


@pytest.fixture
def app():
    collector = InMemoryMetricsCollector.shared()
    collector.counter("http_requests_total", "Total HTTP requests").inc()
    return create_app(Settings())


@pytest.fixture
async def client(app):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


async def test_metrics_returns_prometheus_format(client: AsyncClient) -> None:
    response = await client.get("/metrics")
    assert response.status_code == 200
    assert "text/plain" in response.headers["content-type"]

    body = response.text
    assert "# HELP" in body
    assert "# TYPE" in body
    assert "http_requests_total" in body
