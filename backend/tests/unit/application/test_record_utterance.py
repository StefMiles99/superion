"""Tests RecordUtterance — BE-06."""

from unittest.mock import AsyncMock, MagicMock

import pytest

from application.use_cases.voice.record_utterance import RecordUtteranceUseCase
from domain.entities.user import User
from domain.exceptions import NotFoundError
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
def use_case() -> RecordUtteranceUseCase:
    sessions = AsyncMock()
    append = AsyncMock()
    sessions.get_by_id_for_technician.return_value = MagicMock(current_step_index=2)
    return RecordUtteranceUseCase(sessions=sessions, append_events=append)


async def test_persists_technician_utterance(use_case: RecordUtteranceUseCase) -> None:
    await use_case.execute(
        session_id="sess-1",
        text="ya cerré la válvula",
        current_user=_user(),
        speaker="technician",
        intent="narration",
    )

    use_case._append.emit_system_event.assert_awaited_once_with(
        session_id="sess-1",
        event_type="utterance",
        step_index=2,
        payload={
            "text": "ya cerré la válvula",
            "speaker": "technician",
            "intent": "narration",
        },
    )


async def test_persists_agent_utterance(use_case: RecordUtteranceUseCase) -> None:
    await use_case.execute(
        session_id="sess-1",
        text="Paso 1 de 12. Aislar el equipo.",
        current_user=_user(),
        speaker="agent",
    )

    call_kwargs = use_case._append.emit_system_event.await_args.kwargs
    assert call_kwargs["payload"]["speaker"] == "agent"
    assert call_kwargs["payload"]["text"] == "Paso 1 de 12. Aislar el equipo."


async def test_session_not_found_raises(use_case: RecordUtteranceUseCase) -> None:
    use_case._sessions.get_by_id_for_technician.return_value = None

    with pytest.raises(NotFoundError) as exc:
        await use_case.execute(
            session_id="missing",
            text="hola",
            current_user=_user(),
        )

    assert exc.value.code == "SESSION_NOT_FOUND"
