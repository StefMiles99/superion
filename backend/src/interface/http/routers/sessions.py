"""Router de sesiones — BE-02/BE-03."""

from __future__ import annotations

from fastapi import APIRouter, Depends, Query, Request, Response, status

from application.dto.event import AppendEventInput
from application.use_cases.events.list_since import ListEventsSinceUseCase
from application.use_cases.reports.finalize import FinalizeReportUseCase
from application.use_cases.sessions.get import GetSessionUseCase
from application.use_cases.sessions.pause import PauseSessionUseCase
from application.use_cases.sessions.resume import ResumeSessionUseCase
from domain.entities.user import User
from infrastructure.factories import (
    get_finalize_report_use_case,
    get_list_events_use_case,
    get_list_plant_sessions_use_case,
    get_pause_session_use_case,
    get_post_session_event_use_case,
    get_resume_session_use_case,
    get_session_use_case,
    get_settings,
    get_token_blacklist,
    get_token_service,
    get_user_repository,
)
from interface.http.deps.auth import get_current_user

router = APIRouter(prefix="/v1/sessions", tags=["sessions"])


@router.get("")
async def list_plant_sessions(
    user: User = Depends(get_current_user),
    use_case=Depends(get_list_plant_sessions_use_case),
    limit: int = Query(default=50, ge=1, le=100),
) -> dict[str, object]:
    result = await use_case.execute(current_user=user, limit=limit)
    return result.model_dump()


@router.get("/{session_id}")
async def get_session(
    session_id: str,
    user: User = Depends(get_current_user),
    use_case: GetSessionUseCase = Depends(get_session_use_case),
) -> dict[str, object]:
    result = await use_case.execute(session_id=session_id, current_user=user)
    return result.model_dump()


@router.get("/{session_id}/events")
async def list_session_events(
    session_id: str,
    since_seq: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    user: User = Depends(get_current_user),
    use_case: ListEventsSinceUseCase = Depends(get_list_events_use_case),
) -> dict[str, object]:
    result = await use_case.execute(
        session_id=session_id,
        since_seq=since_seq,
        limit=limit,
        current_user=user,
    )
    return result.model_dump()


@router.post("/{session_id}/events", status_code=status.HTTP_202_ACCEPTED)
async def post_session_event(
    session_id: str,
    request: Request,
) -> dict[str, object]:
    settings = get_settings()
    authorization = request.headers.get("Authorization")
    user = await get_current_user(
        authorization=authorization,
        users=get_user_repository(settings),
        tokens=get_token_service(settings),
        blacklist=get_token_blacklist(),
    )
    body = AppendEventInput.model_validate(await request.json())
    use_case = get_post_session_event_use_case()
    result = await use_case.execute(session_id=session_id, body=body, current_user=user)
    return result.model_dump()


@router.post("/{session_id}/pause", status_code=status.HTTP_204_NO_CONTENT)
async def pause_session(
    session_id: str,
    user: User = Depends(get_current_user),
    use_case: PauseSessionUseCase = Depends(get_pause_session_use_case),
) -> Response:
    await use_case.execute(session_id=session_id, current_user=user)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/{session_id}/resume", status_code=status.HTTP_204_NO_CONTENT)
async def resume_session(
    session_id: str,
    user: User = Depends(get_current_user),
    use_case: ResumeSessionUseCase = Depends(get_resume_session_use_case),
) -> Response:
    await use_case.execute(session_id=session_id, current_user=user)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/{session_id}/finalize")
async def finalize_session(
    session_id: str,
    user: User = Depends(get_current_user),
    use_case: FinalizeReportUseCase = Depends(get_finalize_report_use_case),
) -> dict[str, object]:
    result = await use_case.execute(session_id=session_id, current_user=user)
    return result.model_dump()
