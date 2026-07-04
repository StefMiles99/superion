"""Tests WS photo events — BE-04."""

import asyncio
from uuid import uuid4

import pytest
from httpx import ASGITransport, AsyncClient

from infrastructure.config import Settings
from infrastructure.realtime.event_bus import InMemoryEventBus
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


async def test_upload_emits_captured_and_validated(client: AsyncClient) -> None:
    bus = InMemoryEventBus.shared()
    received: asyncio.Queue[dict[str, object]] = asyncio.Queue()

    async def handler(message: dict[str, object]) -> None:
        await received.put(message)

    headers = await _auth_headers(client)
    start = await client.post("/v1/work-orders/wo-003/start", headers=headers)
    session_id = start.json()["session_id"]
    await bus.subscribe(session_id, handler)

    await client.post(
        f"/v1/sessions/{session_id}/photos",
        headers=headers,
        data={"step_index": "3", "event_id": str(uuid4())},
        files={"file": ("ok.jpg", b"Acontenido", "image/jpeg")},
    )

    types: list[str] = []
    for _ in range(5):
        try:
            msg = await asyncio.wait_for(received.get(), timeout=1)
            types.append(str(msg.get("type")))
        except TimeoutError:
            break

    assert "photo.captured" in types
    assert "photo.validated" in types


async def test_rejected_upload_emits_photo_rejected(client: AsyncClient) -> None:
    bus = InMemoryEventBus.shared()
    received: asyncio.Queue[dict[str, object]] = asyncio.Queue()

    async def handler(message: dict[str, object]) -> None:
        await received.put(message)

    headers = await _auth_headers(client)
    start = await client.post("/v1/work-orders/wo-003/start", headers=headers)
    session_id = start.json()["session_id"]
    await bus.subscribe(session_id, handler)

    await client.post(
        f"/v1/sessions/{session_id}/photos",
        headers=headers,
        data={"step_index": "3", "event_id": str(uuid4())},
        files={"file": ("bad.jpg", b"Rmal", "image/jpeg")},
    )

    types: list[str] = []
    for _ in range(5):
        try:
            msg = await asyncio.wait_for(received.get(), timeout=1)
            types.append(str(msg.get("type")))
        except TimeoutError:
            break

    assert "photo.rejected" in types
