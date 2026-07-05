"""Tests unitarios de security headers — BE-08."""

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


async def test_middleware_adds_security_headers(client: AsyncClient) -> None:
    response = await client.get("/health")
    assert response.status_code == 200

    for header, expected in SECURITY_HEADERS.items():
        assert response.headers.get(header) == expected
