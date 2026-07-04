"""Tests router photos — BE-04."""

import asyncio
from uuid import uuid4

import pytest
from httpx import ASGITransport, AsyncClient

from infrastructure.config import Settings
from interface.main import create_app

FIXTURE_PASSWORD = "test1234"
TEST_SECRET = "test-secret-key-at-least-32-bytes-long"


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


async def _auth_headers(client: AsyncClient) -> dict[str, str]:
    login = await client.post(
        "/v1/auth/login",
        json={"email": "juan@planta.com", "password": FIXTURE_PASSWORD},
    )
    token = login.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


async def _start_session(client: AsyncClient, headers: dict[str, str]) -> str:
    start = await client.post("/v1/work-orders/wo-003/start", headers=headers)
    return start.json()["session_id"]


async def test_multipart_upload_returns_202(client: AsyncClient) -> None:
    headers = await _auth_headers(client)
    session_id = await _start_session(client, headers)

    response = await client.post(
        f"/v1/sessions/{session_id}/photos",
        headers=headers,
        data={
            "step_index": "3",
            "event_id": str(uuid4()),
            "criteria": "sensor visible",
        },
        files={"file": ("photo.jpg", b"Acontenido", "image/jpeg")},
    )
    assert response.status_code == 202
    body = response.json()
    assert body["status"] == "pending"
    assert "photo_id" in body

    await asyncio.sleep(0.1)

    get_resp = await client.get(f"/v1/photos/{body['photo_id']}", headers=headers)
    assert get_resp.status_code == 200
    photo = get_resp.json()
    assert photo["validation_status"] == "accepted"
    assert photo["full_url"].startswith("http://test/v1/mock-storage/")


async def test_get_photo_signed_url_serves_bytes(client: AsyncClient) -> None:
    headers = await _auth_headers(client)
    session_id = await _start_session(client, headers)
    file_bytes = b"Acontenido-de-imagen"

    upload = await client.post(
        f"/v1/sessions/{session_id}/photos",
        headers=headers,
        data={"step_index": "3", "event_id": str(uuid4())},
        files={"file": ("photo.jpg", file_bytes, "image/jpeg")},
    )
    photo_id = upload.json()["photo_id"]
    await asyncio.sleep(0.1)

    meta = await client.get(f"/v1/photos/{photo_id}", headers=headers)
    full_url = meta.json()["full_url"]
    path_with_query = full_url.replace("http://test", "")
    download = await client.get(path_with_query)
    assert download.status_code == 200
    assert download.content == file_bytes
