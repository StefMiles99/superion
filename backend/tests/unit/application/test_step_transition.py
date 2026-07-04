"""Tests TransitionStep — BE-03."""

from uuid import uuid4

import pytest

from application.use_cases.events.append import AppendEventUseCase
from application.use_cases.sessions.transition_step import TransitionStepUseCase
from domain.entities.maintenance_session import MaintenanceSession
from domain.entities.session_event import SessionEvent
from domain.entities.user import User
from domain.exceptions import ConflictError
from domain.value_objects.role import Role
from domain.value_objects.status import SessionStatus
from infrastructure.persistence.in_memory.clock import InMemoryClock
from infrastructure.persistence.in_memory.procedure_template_repository import (
    InMemoryProcedureTemplateRepository,
)
from infrastructure.persistence.in_memory.session_event_repository import (
    InMemorySessionEventRepository,
)
from infrastructure.persistence.in_memory.session_repository import InMemorySessionRepository
from infrastructure.persistence.in_memory.work_order_repository import InMemoryWorkOrderRepository
from infrastructure.realtime.event_bus import InMemoryEventBus


@pytest.fixture
async def setup():
    clock = InMemoryClock.shared()
    sessions = InMemorySessionRepository.shared()
    events = InMemorySessionEventRepository.shared()
    bus = InMemoryEventBus.shared()
    work_orders = InMemoryWorkOrderRepository.shared()
    templates = InMemoryProcedureTemplateRepository.shared()
    await sessions.reset()
    await events.reset()
    await bus.reset()

    order = await work_orders.get_by_id_for_technician("wo-003", technician_id="tech-1")
    assert order is not None

    session = MaintenanceSession(
        id="sess-1",
        work_order_id=order.id,
        technician_id="tech-1",
        status=SessionStatus.ACTIVE,
        started_at=clock.now(),
        current_step_index=3,
        langgraph_thread_id="thread-1",
    )
    await sessions.save(session)

    append = AppendEventUseCase(sessions=sessions, events=events, bus=bus, clock=clock)
    transition = TransitionStepUseCase(
        sessions=sessions,
        work_orders=work_orders,
        templates=templates,
        events=events,
        append_events=append,
    )

    user = User(
        id="tech-1",
        email="juan@planta.com",
        password_hash="hash",
        full_name="Juan",
        role=Role.TECHNICIAN,
        plant_id="plant-1",
        is_blocked=False,
    )
    return transition, events, user


async def test_mark_step_complete_fails_without_photo(setup) -> None:
    transition, _events, user = setup
    with pytest.raises(ConflictError) as exc:
        await transition.mark_step_complete(session_id="sess-1", step_index=3, current_user=user)
    assert exc.value.code == "STEP_REQUIRES_PHOTO"


async def test_mark_step_complete_succeeds_with_accepted_photo(setup) -> None:
    transition, events, user = setup
    clock = InMemoryClock.shared()
    photo = SessionEvent(
        id=str(uuid4()),
        session_id="sess-1",
        seq=1,
        type="photo",
        payload={"status": "accepted", "photo_id": "photo-1"},
        step_index=3,
        created_at=clock.now(),
    )
    await events.append(photo)

    seq = await transition.mark_step_complete(session_id="sess-1", step_index=3, current_user=user)
    assert seq == 2


async def test_skip_step_fails_on_critical_step(setup) -> None:
    transition, _events, user = setup
    with pytest.raises(ConflictError) as exc:
        await transition.skip_step(
            session_id="sess-1",
            step_index=2,
            reason="no aplica",
            current_user=user,
        )
    assert exc.value.code == "STEP_CRITICAL_CANNOT_SKIP"


async def test_skip_step_succeeds_on_non_critical(setup) -> None:
    transition, _events, user = setup
    seq = await transition.skip_step(
        session_id="sess-1",
        step_index=1,
        reason="no aplica",
        current_user=user,
    )
    assert seq == 1
