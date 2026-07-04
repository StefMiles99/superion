"""Tests MockLangGraphClient state — BE-06."""

import pytest

from application.use_cases.events.append import AppendEventUseCase
from application.use_cases.sessions.pause import PauseSessionUseCase
from application.use_cases.sessions.transition_step import TransitionStepUseCase
from application.use_cases.voice.execute_tool import ExecuteToolUseCase
from application.use_cases.voice.tool_add_finding import ToolAddFindingUseCase
from application.use_cases.voice.tool_add_measurement import ToolAddMeasurementUseCase
from application.use_cases.voice.tool_mark_step_complete import ToolMarkStepCompleteUseCase
from application.use_cases.voice.tool_query_manual import ToolQueryManualUseCase
from application.use_cases.voice.tool_request_photo import ToolRequestPhotoUseCase
from domain.entities.maintenance_session import MaintenanceSession
from domain.entities.user import User
from domain.value_objects.role import Role
from domain.value_objects.status import SessionStatus
from infrastructure.factories import get_rag_query_use_case
from infrastructure.persistence.in_memory.asset_repository import InMemoryAssetRepository
from infrastructure.persistence.in_memory.clock import InMemoryClock
from infrastructure.persistence.in_memory.procedure_template_repository import (
    InMemoryProcedureTemplateRepository,
)
from infrastructure.persistence.in_memory.session_event_repository import (
    InMemorySessionEventRepository,
)
from infrastructure.persistence.in_memory.session_repository import InMemorySessionRepository
from infrastructure.persistence.in_memory.work_order_repository import InMemoryWorkOrderRepository
from infrastructure.realtime.langgraph_client import MockLangGraphClient


@pytest.fixture
async def setup():
    clock = InMemoryClock.shared()
    sessions = InMemorySessionRepository.shared()
    events = InMemorySessionEventRepository.shared()
    bus = __import__(
        "infrastructure.realtime.event_bus",
        fromlist=["InMemoryEventBus"],
    ).InMemoryEventBus.shared()
    work_orders = InMemoryWorkOrderRepository.shared()
    templates = InMemoryProcedureTemplateRepository.shared()
    await sessions.reset()
    await events.reset()
    await bus.reset()
    MockLangGraphClient.reset_singleton()

    session = MaintenanceSession(
        id="sess-lg-1",
        work_order_id="wo-003",
        technician_id="tech-1",
        status=SessionStatus.ACTIVE,
        started_at=clock.now(),
        current_step_index=0,
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

    execute_tool = ExecuteToolUseCase(
        query_manual=ToolQueryManualUseCase(
            sessions=sessions,
            work_orders=work_orders,
            assets=InMemoryAssetRepository.shared(),
            rag_query=get_rag_query_use_case(),
            append_events=append,
        ),
        mark_step_complete=ToolMarkStepCompleteUseCase(
            sessions=sessions,
            transition_step=transition,
            append_events=append,
        ),
        request_photo=ToolRequestPhotoUseCase(sessions=sessions, append_events=append),
        add_finding=ToolAddFindingUseCase(sessions=sessions, append_events=append),
        add_measurement=ToolAddMeasurementUseCase(sessions=sessions, append_events=append),
        transition_step=transition,
        pause_session=PauseSessionUseCase(sessions=sessions, append_events=append),
    )

    langgraph = MockLangGraphClient.shared(execute_tool=execute_tool)

    user = User(
        id="tech-1",
        email="juan@planta.com",
        password_hash="hash",
        full_name="Juan",
        role=Role.TECHNICIAN,
        plant_id="plant-1",
        is_blocked=False,
    )
    return langgraph, events, user


async def test_invoke_updates_state_and_emits_events(setup) -> None:
    langgraph, event_repo, user = setup

    result = await langgraph.invoke(
        session_id="sess-lg-1",
        tool_name="mark_step_complete",
        arguments={"step_index": 0},
        current_user=user,
    )
    assert result["ok"] is True

    state = await langgraph.get_state("sess-lg-1")
    assert state is not None
    assert state["last_action"] == "mark_step_complete"
    assert state["current_step_index"] == 1

    stored = await event_repo.list_since("sess-lg-1", since_seq=0)
    types = [event.type for event in stored]
    assert "tool.called" in types
    assert "step.completed" in types
