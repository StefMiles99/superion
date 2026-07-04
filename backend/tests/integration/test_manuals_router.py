"""Tests router manuals — BE-05."""

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
    token = login.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


async def test_upload_list_get_archive(client: AsyncClient) -> None:
    headers = await _admin_headers(client)
    pdf = dummy_pdf("Pagina 1: torque 85 Nm", "Pagina 2: valvula")

    upload = await client.post(
        "/v1/manuals",
        headers=headers,
        data={"title": "Atlas Copco GA-37", "asset_model": "Atlas Copco GA-37"},
        files={"file": ("manual.pdf", pdf, "application/pdf")},
    )
    assert upload.status_code == 202
    manual_id = upload.json()["manual_id"]
    assert upload.json()["index_status"] == "pending"

    listing = await client.get("/v1/manuals", headers=headers)
    assert listing.status_code == 200
    ids = [item["id"] for item in listing.json()["items"]]
    assert manual_id in ids

    detail = await client.get(f"/v1/manuals/{manual_id}", headers=headers)
    assert detail.status_code == 200
    assert detail.json()["download_url"].startswith("http://test/v1/mock-storage/")

    delete = await client.delete(f"/v1/manuals/{manual_id}", headers=headers)
    assert delete.status_code == 204

    archived = await client.get(f"/v1/manuals/{manual_id}", headers=headers)
    assert archived.json()["status"] == "archived"


async def test_technician_cannot_upload(client: AsyncClient) -> None:
    login = await client.post(
        "/v1/auth/login",
        json={"email": "juan@planta.com", "password": FIXTURE_PASSWORD},
    )
    headers = {"Authorization": f"Bearer {login.json()['access_token']}"}
    pdf = dummy_pdf("Pagina 1")
    response = await client.post(
        "/v1/manuals",
        headers=headers,
        data={"title": "T", "asset_model": "M"},
        files={"file": ("manual.pdf", pdf, "application/pdf")},
    )
    assert response.status_code == 403
