"""Tests HandleWebhook — BE-06."""

import json
from unittest.mock import AsyncMock, MagicMock

import pytest

from application.use_cases.voice.handle_webhook import HandleWebhookUseCase
from domain.entities.user import User
from domain.exceptions import UnauthorizedError, ValidationError
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
def use_case() -> HandleWebhookUseCase:
    signature = MagicMock()
    sessions = AsyncMock()
    users = AsyncMock()
    classify = AsyncMock()
    pause = AsyncMock()
    langgraph = AsyncMock()

    return HandleWebhookUseCase(
        signature_validator=signature,
        sessions=sessions,
        users=users,
        classify_and_route=classify,
        pause_session=pause,
        langgraph=langgraph,
    )


async def test_invalid_signature_raises(use_case: HandleWebhookUseCase) -> None:
    use_case._signature.validate.side_effect = UnauthorizedError(
        code="INVALID_SIGNATURE",
        message="Firma incorrecta.",
    )
    with pytest.raises(UnauthorizedError) as exc:
        await use_case.execute(
            raw_body=b"{}",
            signature_header="t=1,v1=bad",
            current_user=_user(),
        )
    assert exc.value.code == "INVALID_SIGNATURE"


async def test_unknown_event_raises(use_case: HandleWebhookUseCase) -> None:
    payload = json.dumps({"event": "unknown.event", "session_id": "sess-1"}).encode()
    with pytest.raises(ValidationError) as exc:
        await use_case.execute(
            raw_body=payload,
            signature_header="t=1,v1=ok",
            current_user=_user(),
        )
    assert "desconocido" in exc.value.message.lower()


async def test_utterance_final_dispatches_classify(use_case: HandleWebhookUseCase) -> None:
    user = _user()
    use_case._sessions.get_by_id_for_technician.return_value = MagicMock()
    payload = json.dumps(
        {
            "event": "utterance.final",
            "session_id": "sess-1",
            "text": "siguiente",
        }
    ).encode()

    result = await use_case.execute(
        raw_body=payload,
        signature_header="t=1,v1=ok",
        current_user=user,
    )

    assert result.accepted is True
    assert result.event == "utterance.final"
    use_case._classify.execute.assert_awaited_once()
    use_case._signature.validate.assert_called_once()
