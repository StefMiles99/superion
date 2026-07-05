"""Tests ClassifyAndRoute — BE-06."""

from unittest.mock import AsyncMock, MagicMock

import pytest

from application.use_cases.voice.classify_and_route import ClassifyAndRouteUseCase
from domain.entities.user import User
from domain.value_objects.role import Role


def _user() -> User:
    return User(
        id="tech-1",
        email="juan@planta.com",
        password_hash="hash",
        full_name="Juan",
        role=Role.TECHNICIAN,
        plant_id="plant-1",
        is_blocked=False,
    )


@pytest.fixture
def use_case() -> ClassifyAndRouteUseCase:
    sessions = AsyncMock()
    sessions.get_by_id_for_technician.return_value = MagicMock(current_step_index=1)
    classifier = MagicMock()
    record_utterance = AsyncMock()
    record_observation = AsyncMock()
    execute_tool = AsyncMock()
    add_measurement = MagicMock()

    return ClassifyAndRouteUseCase(
        sessions=sessions,
        classifier=classifier,
        record_utterance=record_utterance,
        record_observation=record_observation,
        execute_tool=execute_tool,
        add_measurement=add_measurement,
    )


async def test_always_records_utterance_before_routing(use_case: ClassifyAndRouteUseCase) -> None:
    use_case._classifier.classify.return_value = ("advance", 0.9)

    await use_case.execute(
        session_id="sess-1",
        text="siguiente",
        current_user=_user(),
    )

    use_case._record_utterance.execute.assert_awaited_once()
    use_case._execute_tool.execute.assert_awaited_once()


async def test_narration_records_observation(use_case: ClassifyAndRouteUseCase) -> None:
    use_case._classifier.classify.return_value = ("narration", 0.7)

    await use_case.execute(
        session_id="sess-1",
        text="ya cerré la válvula V-12",
        current_user=_user(),
    )

    use_case._record_utterance.execute.assert_awaited_once()
    use_case._record_observation.execute.assert_awaited_once_with(
        session_id="sess-1",
        text="ya cerré la válvula V-12",
        current_user=_user(),
    )
    use_case._execute_tool.execute.assert_not_awaited()


async def test_finding_routes_to_add_finding(use_case: ClassifyAndRouteUseCase) -> None:
    use_case._classifier.classify.return_value = ("finding", 0.9)

    await use_case.execute(
        session_id="sess-1",
        text="veo una fuga en la válvula",
        current_user=_user(),
    )

    use_case._execute_tool.execute.assert_awaited_once()
    call_kwargs = use_case._execute_tool.execute.await_args.kwargs
    assert call_kwargs["tool_name"] == "add_finding"
