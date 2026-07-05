"""Tests ConnectSessionUseCase — BE-09."""

from datetime import UTC, datetime

import pytest

from application.use_cases.voice.connect_session import ConnectSessionUseCase
from domain.entities.maintenance_session import MaintenanceSession
from domain.entities.user import User
from domain.exceptions import ConflictError, ForbiddenError, NotFoundError, ValidationError
from domain.value_objects.role import Role
from domain.value_objects.status import SessionStatus
from infrastructure.external.elevenlabs.in_memory_conversation_client import (
    InMemoryConversationClient,
)
from infrastructure.persistence.in_memory.asset_repository import InMemoryAssetRepository
from infrastructure.persistence.in_memory.clock import InMemoryClock
from infrastructure.persistence.in_memory.session_repository import InMemorySessionRepository
from infrastructure.persistence.in_memory.work_order_repository import InMemoryWorkOrderRepository


@pytest.fixture
def juan() -> User:
    return User(
        id="tech-1",
        email="juan@planta.com",
        password_hash="hash",
        full_name="Juan Pérez",
        role=Role.TECHNICIAN,
        plant_id="plant-1",
    )


@pytest.fixture
def other_user() -> User:
    return User(
        id="tech-2",
        email="otro@planta.com",
        password_hash="hash",
        full_name="Otro",
        role=Role.TECHNICIAN,
        plant_id="plant-1",
    )


@pytest.fixture
async def sessions_repo() -> InMemorySessionRepository:
    repo = InMemorySessionRepository()
    await repo.save(
        MaintenanceSession(
            id="sess-active-1",
            work_order_id="wo-001",
            technician_id="tech-1",
            status=SessionStatus.ACTIVE,
            started_at=datetime(2026, 7, 4, 14, 0, tzinfo=UTC),
            current_step_index=0,
            langgraph_thread_id="thread-1",
        )
    )
    await repo.save(
        MaintenanceSession(
            id="sess-finalized-1",
            work_order_id="wo-002",
            technician_id="tech-1",
            status=SessionStatus.FINALIZED,
            started_at=datetime(2026, 7, 4, 10, 0, tzinfo=UTC),
            current_step_index=5,
            langgraph_thread_id="thread-2",
            ended_at=datetime(2026, 7, 4, 12, 0, tzinfo=UTC),
        )
    )
    return repo


@pytest.fixture
def use_case(sessions_repo: InMemorySessionRepository) -> ConnectSessionUseCase:
    clock = InMemoryClock(datetime(2026, 7, 4, 20, 0, tzinfo=UTC))
    return ConnectSessionUseCase(
        sessions=sessions_repo,
        work_orders=InMemoryWorkOrderRepository.with_fixtures(),
        assets=InMemoryAssetRepository.with_fixtures(),
        conversation_client=InMemoryConversationClient(
            clock=clock,
            agent_id="agent_mock_1",
        ),
        agent_id="agent_mock_1",
    )


async def test_connect_session_returns_signed_url(juan: User, use_case: ConnectSessionUseCase) -> None:
    result = await use_case.execute(session_id="sess-active-1", current_user=juan)
    assert result.agent_id == "agent_mock_1"
    assert result.connect_mode == "signed_url"
    assert result.signed_url.startswith("wss://mock.elevenlabs.test/")
    assert result.expires_at


async def test_connect_session_forbidden_for_other_technician(
    other_user: User,
    use_case: ConnectSessionUseCase,
) -> None:
    with pytest.raises(ForbiddenError):
        await use_case.execute(session_id="sess-active-1", current_user=other_user)


async def test_connect_session_not_found(juan: User, use_case: ConnectSessionUseCase) -> None:
    with pytest.raises(NotFoundError) as exc_info:
        await use_case.execute(session_id="sess-missing", current_user=juan)
    assert exc_info.value.code == "SESSION_NOT_FOUND"


async def test_connect_session_not_active(juan: User, use_case: ConnectSessionUseCase) -> None:
    with pytest.raises(ConflictError) as exc_info:
        await use_case.execute(session_id="sess-finalized-1", current_user=juan)
    assert exc_info.value.code == "SESSION_NOT_ACTIVE"


async def test_connect_session_agent_not_configured(
    juan: User,
    sessions_repo: InMemorySessionRepository,
) -> None:
    clock = InMemoryClock(datetime(2026, 7, 4, 20, 0, tzinfo=UTC))
    use_case = ConnectSessionUseCase(
        sessions=sessions_repo,
        work_orders=InMemoryWorkOrderRepository.with_fixtures(),
        assets=InMemoryAssetRepository.with_fixtures(),
        conversation_client=InMemoryConversationClient(clock=clock, agent_id="agent_mock_1"),
        agent_id="",
    )
    with pytest.raises(ValidationError) as exc_info:
        await use_case.execute(session_id="sess-active-1", current_user=juan)
    assert exc_info.value.code == "AGENT_NOT_PROVISIONED"
