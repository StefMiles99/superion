"""E2E RAG — BE-05."""

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
def settings() -> Settings:
    return Settings(
        JWT_SECRET=TEST_SECRET,
        PASSWORD_BCRYPT_ROUNDS=4,
        CLOCK_MODE="memory",
        API_BASE_URL="http://test",
    )


@pytest.fixture
def app(settings: Settings):
    return create_app(settings)


@pytest.fixture
async def client(app):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


async def test_rag_e2e_upload_index_query(client: AsyncClient) -> None:
    login = await client.post(
        "/v1/auth/login",
        json={"email": "admin@planta.com", "password": FIXTURE_PASSWORD},
    )
    headers = {"Authorization": f"Bearer {login.json()['access_token']}"}

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
    assert upload.status_code == 202
    manual_id = upload.json()["manual_id"]

    detail = None
    for _ in range(20):
        await asyncio.sleep(0.05)
        detail = await client.get(f"/v1/manuals/{manual_id}", headers=headers)
        if detail.json()["index_status"] == "indexed":
            break

    assert detail is not None
    assert detail.json()["chunk_count"] >= 3

    search = await client.get(
        f"/v1/manuals/{manual_id}/search",
        headers=headers,
        params={"q": "torque"},
    )
    assert search.status_code == 200
    assert search.json()["items"]

    rag = await client.post(
        "/v1/internal/rag/query",
        headers=headers,
        json={
            "question": "¿cuál es el torque?",
            "asset_model": "Atlas Copco GA-37",
        },
    )
    assert rag.status_code == 200
    body = rag.json()
    assert body["abstained"] is False
    assert body["citations"]
    assert "85" in body["answer"]
