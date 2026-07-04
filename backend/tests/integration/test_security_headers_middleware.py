"""Tests de security headers middleware — BE-08."""

import pytest
from httpx import ASGITransport, AsyncClient

from infrastructure.config import Settings
from interface.http.middleware.security_headers import SECURITY_HEADERS
from interface.main import create_app


@pytest.fixture
def app():
    return create_app(Settings(SECURITY_HEADERS=True))


@pytest.fixture
async def client(app):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


async def test_security_headers_on_health(client: AsyncClient) -> None:
    response = await client.get("/health")
    assert response.status_code == 200

    for header in SECURITY_HEADERS:
        assert header in response.headers
