"""Tests endpoint RAG — BE-05."""

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


async def _upload_and_wait_indexed(client: AsyncClient, headers: dict[str, str]) -> str:
    pdf = dummy_pdf("Pagina 1: torque 85 Nm", "Pagina 2: valvula V-12")
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
            return manual_id
    raise AssertionError("Manual no indexado a tiempo")


async def test_search_returns_scored_chunks(client: AsyncClient) -> None:
    headers = await _admin_headers(client)
    manual_id = await _upload_and_wait_indexed(client, headers)

    search = await client.get(
        f"/v1/manuals/{manual_id}/search",
        headers=headers,
        params={"q": "torque"},
    )
    assert search.status_code == 200
    items = search.json()["items"]
    assert items
    assert items[0]["score"] > 0
    assert "torque" in items[0]["content"].lower()


async def test_internal_rag_query_returns_citation(client: AsyncClient) -> None:
    headers = await _admin_headers(client)
    await _upload_and_wait_indexed(client, headers)

    response = await client.post(
        "/v1/internal/rag/query",
        headers=headers,
        json={
            "question": "¿cuál es el torque?",
            "asset_model": "Atlas Copco GA-37",
        },
    )
    assert response.status_code == 200
    body = response.json()
    assert body["abstained"] is False
    assert body["citations"]
    assert body["citations"][0]["page"] == 1
