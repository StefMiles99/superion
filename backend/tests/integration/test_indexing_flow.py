"""Tests flujo de indexación — BE-05."""

import asyncio

import pytest
from httpx import ASGITransport, AsyncClient

from infrastructure.config import Settings
from interface.main import create_app

FIXTURE_PASSWORD = "test1234"
TEST_SECRET = "test-secret-key-at-least-32-bytes-long"


def dummy_pdf(*pages: str) -> bytes:
    return b"%PDF-1.4\n" + "\f".join(pages).encode("latin-1")


@pytest.fixture
def app():
    settings = Settings(
        JWT_SECRET=TEST_SECRET,
        PASSWORD_BCRYPT_ROUNDS=4,
        CLOCK_MODE="memory",
        API_BASE_URL="http://test",
    )
    return create_app(settings)


@pytest.fixture
async def client(app):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


async def _admin_headers(client: AsyncClient) -> dict[str, str]:
    login = await client.post(
        "/v1/auth/login",
        json={"email": "admin@planta.com", "password": FIXTURE_PASSWORD},
    )
    return {"Authorization": f"Bearer {login.json()['access_token']}"}


async def test_upload_indexes_async_with_chunks(client: AsyncClient) -> None:
    headers = await _admin_headers(client)
    pdf = dummy_pdf(
        "Pagina 1: torque 85 Nm",
        "Pagina 2: valvula V-12",
        "Pagina 3: limpiar filtro",
    )

    upload = await client.post(
        "/v1/manuals",
        headers=headers,
        data={"title": "Atlas Copco GA-37", "asset_model": "Atlas Copco GA-37"},
        files={"file": ("manual.pdf", pdf, "application/pdf")},
    )
    manual_id = upload.json()["manual_id"]

    for _ in range(20):
        await asyncio.sleep(0.05)
        detail = await client.get(f"/v1/manuals/{manual_id}", headers=headers)
        if detail.json()["index_status"] == "indexed":
            break

    body = detail.json()
    assert body["index_status"] == "indexed"
    assert body["chunk_count"] >= 3
    assert body["status"] == "active"
