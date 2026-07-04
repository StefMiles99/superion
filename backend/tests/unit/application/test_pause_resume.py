"""Tests Pause/Resume — BE-03."""

import pytest

from application.use_cases.events.append import AppendEventUseCase
from application.use_cases.sessions.pause import PauseSessionUseCase
from application.use_cases.sessions.resume import ResumeSessionUseCase
from domain.entities.maintenance_session import MaintenanceSession
from domain.entities.user import User
from domain.exceptions import ConflictError
from domain.value_objects.role import Role
from domain.value_objects.status import SessionStatus
from infrastructure.persistence.in_memory.clock import InMemoryClock
from infrastructure.persistence.in_memory.session_event_repository import (
    InMemorySessionEventRepository,
)
from infrastructure.persistence.in_memory.session_repository import InMemorySessionRepository
from infrastructure.realtime.event_bus import InMemoryEventBus


@pytest.fixture
async def setup():
    clock = InMemoryClock.shared()
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

    append = AppendEventUseCase(sessions=sessions, events=events, bus=bus, clock=clock)
    pause = PauseSessionUseCase(sessions=sessions, append_events=append)
    resume = ResumeSessionUseCase(sessions=sessions, append_events=append)

    user = User(
        id="tech-1",
        email="juan@planta.com",
        password_hash="hash",
        full_name="Juan",
        role=Role.TECHNICIAN,
        plant_id="plant-1",
        is_blocked=False,
    )
    return sessions, pause, resume, user


async def test_pause_changes_status_to_paused(setup) -> None:
    sessions, pause, _resume, user = setup
    await pause.execute(session_id="sess-1", current_user=user)
    session = await sessions.get_by_id_for_technician("sess-1", technician_id=user.id)
    assert session is not None
    assert session.status == SessionStatus.PAUSED


async def test_resume_changes_status_to_active(setup) -> None:
    sessions, pause, resume, user = setup
    await pause.execute(session_id="sess-1", current_user=user)
    await resume.execute(session_id="sess-1", current_user=user)
    session = await sessions.get_by_id_for_technician("sess-1", technician_id=user.id)
    assert session is not None
    assert session.status == SessionStatus.ACTIVE


async def test_pause_rejects_already_paused(setup) -> None:
    _sessions, pause, _resume, user = setup
    await pause.execute(session_id="sess-1", current_user=user)
    with pytest.raises(ConflictError):
        await pause.execute(session_id="sess-1", current_user=user)
