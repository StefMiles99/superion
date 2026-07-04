"""Router de sesiones — BE-02."""

from __future__ import annotations

from fastapi import APIRouter, Depends

from application.use_cases.sessions.get import GetSessionUseCase
from domain.entities.user import User
from infrastructure.factories import get_session_use_case
from interface.http.deps.auth import get_current_user

router = APIRouter(prefix="/v1/sessions", tags=["sessions"])


@router.get("/{session_id}")
async def get_session(
    session_id: str,
    user: User = Depends(get_current_user),
    use_case: GetSessionUseCase = Depends(get_session_use_case),
) -> dict[str, object]:
    result = await use_case.execute(session_id=session_id, current_user=user)
    return result.model_dump()
