"""Tests ExecuteTool router — BE-06."""

import pytest

from application.use_cases.voice.execute_tool import ExecuteToolUseCase
from domain.exceptions import ValidationError


def test_supported_tools_set() -> None:
    assert "query_manual" in ExecuteToolUseCase.SUPPORTED_TOOLS
    assert "mark_step_complete" in ExecuteToolUseCase.SUPPORTED_TOOLS
    assert "request_evidence_photo" in ExecuteToolUseCase.SUPPORTED_TOOLS
    assert "add_finding" in ExecuteToolUseCase.SUPPORTED_TOOLS
    assert "add_measurement" in ExecuteToolUseCase.SUPPORTED_TOOLS


class _StubTool:
    async def execute(self, **kwargs: object) -> dict[str, object]:
        return {"ok": True, "kwargs": kwargs}


class _StubTransition:
    async def skip_step(self, **kwargs: object) -> int:
        return 1


class _StubPause:
    async def execute(self, **kwargs: object) -> int:
        return 1


@pytest.fixture
def router() -> ExecuteToolUseCase:
    return ExecuteToolUseCase(
        query_manual=_StubTool(),
        mark_step_complete=_StubTool(),
        request_photo=_StubTool(),
        add_finding=_StubTool(),
        add_measurement=_StubTool(),
        transition_step=_StubTransition(),
        pause_session=_StubPause(),
    )


async def test_unknown_tool_raises(router: ExecuteToolUseCase) -> None:
    from domain.entities.user import User
    from domain.value_objects.role import Role

    user = User(
        id="tech-1",
        email="juan@planta.com",
        password_hash="hash",
        full_name="Juan",
        role=Role.TECHNICIAN,
        plant_id="plant-1",
        is_blocked=False,
    )
    with pytest.raises(ValidationError) as exc:
        await router.execute(
            tool_name="nonexistent_tool",
            session_id="sess-1",
            arguments={},
            current_user=user,
        )
    assert "no soportado" in exc.value.message.lower()
