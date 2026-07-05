"""Router voice connect — BE-09."""

from __future__ import annotations

from fastapi import APIRouter, Depends, status

from application.use_cases.voice.connect_session import ConnectSessionUseCase
from domain.entities.user import User
from infrastructure.factories import get_connect_session_use_case
from interface.http.deps.auth import get_current_user

router = APIRouter(prefix="/v1/sessions", tags=["voice"])


@router.post("/{session_id}/voice/connect", status_code=status.HTTP_200_OK)
async def connect_session_voice(
    session_id: str,
    user: User = Depends(get_current_user),
    use_case: ConnectSessionUseCase = Depends(get_connect_session_use_case),
) -> dict[str, object]:
    result = await use_case.execute(session_id=session_id, current_user=user)
    return result.model_dump()
