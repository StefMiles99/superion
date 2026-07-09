"""Tests ToolGetCurrentStep — BE-06."""

from unittest.mock import AsyncMock, MagicMock

import pytest

from application.use_cases.voice.tool_get_current_step import ToolGetCurrentStepUseCase
from domain.entities.user import User
from domain.value_objects.role import Role


@pytest.fixture
def technician() -> User:
    return User(
        id="tech-1",
        email="juan@planta.com",
        password_hash="hash",
        full_name="Juan",
        role=Role.TECHNICIAN,
        plant_id="plant-1",
        is_blocked=False,
    )


async def test_get_current_step_returns_step_and_emits_event(technician: User) -> None:
    transition = AsyncMock()
    transition.get_current_step.return_value = {
        "index": 0,
        "title": "Preparar área",
        "description": "Procedimiento: preparar área.",
        "estimated_minutes": 4,
        "critical": False,
        "requires_photo": False,
        "photo_criteria": None,
        "current_step_index": 0,
        "total_steps": 12,
        "all_steps_completed": False,
    }
    append = AsyncMock()

    use_case = ToolGetCurrentStepUseCase(
        transition_step=transition,
        append_events=append,
    )

    result = await use_case.execute(
        session_id="sess-1",
        current_user=technician,
        call_id="call-1",
    )

    assert result["title"] == "Preparar área"
    assert result["current_step_index"] == 0
    transition.get_current_step.assert_awaited_once_with(
        session_id="sess-1",
        current_user=technician,
    )
    append.emit_system_event.assert_awaited_once()
    payload = append.emit_system_event.await_args.kwargs["payload"]
    assert payload["tool_name"] == "get_current_step"
