"""Tests AppendEventUseCase — BE-03."""

from uuid import uuid4

import pytest

from application.use_cases.events.append import AppendEventUseCase
from domain.entities.maintenance_session import MaintenanceSession
from domain.entities.user import User
from domain.value_objects.role import Role
from domain.value_objects.status import SessionStatus
from infrastructure.persistence.in_memory.clock import InMemoryClock
from infrastructure.persistence.in_memory.session_event_repository import (
    InMemorySessionEventRepository,
)
from infrastructure.persistence.in_memory.session_repository import InMemorySessionRepository
from infrastructure.realtime.event_bus import InMemoryEventBus


@pytest.fixture
def clock() -> InMemoryClock:
    return InMemoryClock.shared()


@pytest.fixture
async def repos(clock: InMemoryClock):
    sessions = InMemorySessionRepository.shared()
    events = InMemorySessionEventRepository.shared()
    bus = InMemoryEventBus.shared()
    await sessions.reset()
    await events.reset()
    await bus.reset()
    session = MaintenanceSession(
        id="sess-1",
        work_order_id="wo-1",
        technician_id="tech-1",
        status=SessionStatus.ACTIVE,
        started_at=clock.now(),
        current_step_index=0,
        langgraph_thread_id="thread-1",
    )
    await sessions.save(session)
    return sessions, events, bus


@pytest.fixture
def technician() -> User:
    return User(
        password_hash="hash",
        id="tech-1",
        email="juan@planta.com",
        full_name="Juan",
        role=Role.TECHNICIAN,
        plant_id="plant-1",
        is_blocked=False,
    )


@pytest.fixture
def use_case(repos, clock: InMemoryClock) -> AppendEventUseCase:
    sessions, events, bus = repos
    return AppendEventUseCase(sessions=sessions, events=events, bus=bus, clock=clock)


async def test_append_generates_monotonic_seq(
    use_case: AppendEventUseCase,
    technician: User,
) -> None:
    eid1 = str(uuid4())
    eid2 = str(uuid4())

    r1 = await use_case.execute(
        session_id="sess-1",
        event_id=eid1,
        event_type="measurement",
        step_index=0,
        payload={"name": "presion", "value": 85.2, "unit": "psi"},
        current_user=technician,
    )
    r2 = await use_case.execute(
        session_id="sess-1",
        event_id=eid2,
        event_type="measurement",
        step_index=0,
        payload={"name": "temp", "value": 40.0, "unit": "c"},
        current_user=technician,
    )

    assert r1.seq == 1
    assert r2.seq == 2


async def test_append_idempotency_same_event_id(
    use_case: AppendEventUseCase,
    technician: User,
) -> None:
    eid = str(uuid4())

    r1 = await use_case.execute(
        session_id="sess-1",
        event_id=eid,
        event_type="measurement",
        step_index=0,
        payload={"name": "presion", "value": 85.2, "unit": "psi"},
        current_user=technician,
    )
    r2 = await use_case.execute(
        session_id="sess-1",
        event_id=eid,
        event_type="measurement",
        step_index=0,
        payload={"name": "presion", "value": 99.0, "unit": "psi"},
        current_user=technician,
    )

    assert r1.seq == r2.seq == 1
