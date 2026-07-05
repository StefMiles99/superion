"""Tests de StartSessionUseCase — BE-02."""

from datetime import UTC, datetime

import pytest

from application.use_cases.work_orders.start_session import StartSessionUseCase
from domain.entities.user import User
from domain.exceptions import ConflictError, NotFoundError
from domain.value_objects.role import Role
from infrastructure.persistence.in_memory.clock import InMemoryClock
from infrastructure.persistence.in_memory.procedure_template_repository import (
    InMemoryProcedureTemplateRepository,
)
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
def clock() -> InMemoryClock:
    clock = InMemoryClock(datetime(2026, 7, 4, 14, 0, tzinfo=UTC))
    return clock


@pytest.fixture
def use_case(clock: InMemoryClock) -> StartSessionUseCase:
    return StartSessionUseCase(
        work_orders=InMemoryWorkOrderRepository.with_fixtures(),
        sessions=InMemorySessionRepository(),
        templates=InMemoryProcedureTemplateRepository.with_fixtures(),
        clock=clock,
    )


async def test_start_session_happy_path(juan: User, use_case: StartSessionUseCase) -> None:
    result = await use_case.execute(work_order_id="wo-001", current_user=juan)
    assert result.session_id
    assert result.work_order_id == "wo-001"
    assert len(result.procedure_template.steps) == 12
    assert result.websocket_url.startswith("wss://placeholder/sessions/")
    assert result.started_at == "2026-07-04T14:00:00Z"


async def test_start_session_work_order_not_found(
    juan: User,
    use_case: StartSessionUseCase,
) -> None:
    with pytest.raises(NotFoundError) as exc_info:
        await use_case.execute(work_order_id="wo-maria-1", current_user=juan)
    assert exc_info.value.code == "WORK_ORDER_NOT_FOUND"


async def test_start_session_already_started(
    juan: User,
    use_case: StartSessionUseCase,
) -> None:
    with pytest.raises(ConflictError) as exc_info:
        await use_case.execute(work_order_id="wo-004", current_user=juan)
    assert exc_info.value.code == "WORK_ORDER_ALREADY_STARTED"


async def test_start_session_already_completed(
    juan: User,
    use_case: StartSessionUseCase,
) -> None:
    with pytest.raises(ConflictError) as exc_info:
        await use_case.execute(work_order_id="wo-005", current_user=juan)
    assert exc_info.value.code == "WORK_ORDER_ALREADY_COMPLETED"


async def test_start_session_twice_resumes_same_session(
    juan: User,
    use_case: StartSessionUseCase,
) -> None:
    first = await use_case.execute(work_order_id="wo-001", current_user=juan)
    second = await use_case.execute(work_order_id="wo-001", current_user=juan)
    assert second.session_id == first.session_id
    assert len(second.procedure_template.steps) == 12
