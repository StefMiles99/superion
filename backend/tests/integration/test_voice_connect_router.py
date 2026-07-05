"""Tests integration voice connect — BE-09."""

from datetime import UTC, datetime

import pytest
from httpx import ASGITransport, AsyncClient

from domain.entities.maintenance_session import MaintenanceSession
from domain.value_objects.status import SessionStatus
from infrastructure.config import Settings
from infrastructure.persistence.in_memory.session_repository import InMemorySessionRepository
from interface.main import create_app

TEST_JWT_SECRET = "test-secret-key-at-least-32-bytes-long"


@pytest.fixture
def app():
    settings = Settings(
        JWT_SECRET=TEST_JWT_SECRET,
        PASSWORD_BCRYPT_ROUNDS=4,
        ELEVENLABS_AGENT_ID="agent_mock_integration",
    )
    application = create_app(settings)
    return application


@pytest.fixture
async def seeded_session() -> None:
    repo = InMemorySessionRepository.shared()
    await repo.save(
        MaintenanceSession(
            id="sess-voice-1",
            work_order_id="wo-001",
            technician_id="tech-1",
            status=SessionStatus.ACTIVE,
            started_at=datetime(2026, 7, 4, 14, 0, tzinfo=UTC),
            current_step_index=0,
            langgraph_thread_id="thread-voice-1",
        )
    )


@pytest.fixture
async def auth_token(app) -> str:
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post(
            "/v1/auth/login",
            json={"email": "juan@planta.com", "password": "test1234"},
        )
        assert response.status_code == 200
        return response.json()["access_token"]


async def test_voice_connect_returns_signed_url(
    app,
    auth_token: str,
    seeded_session: None,
) -> None:
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post(
            "/v1/sessions/sess-voice-1/voice/connect",
            headers={"Authorization": f"Bearer {auth_token}"},
        )
    assert response.status_code == 200
    body = response.json()
    assert body["agent_id"] == "agent_mock_integration"
    assert body["connect_mode"] == "signed_url"
    assert body["signed_url"].startswith("wss://mock.elevenlabs.test/")
