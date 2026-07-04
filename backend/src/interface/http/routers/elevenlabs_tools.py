"""Router tools ElevenLabs — BE-06."""

from __future__ import annotations

from fastapi import APIRouter, Depends, Request

from application.dto.tool import ToolCallInput, ToolCallOutput
from application.use_cases.voice.execute_tool import ExecuteToolUseCase
from domain.exceptions import ForbiddenError, NotFoundError
from infrastructure.factories import (
    get_execute_tool_use_case,
    get_session_repository,
    get_token_blacklist,
    get_token_service,
    get_user_repository,
)
from interface.http.deps.auth import get_current_user

router = APIRouter(prefix="/v1/elevenlabs", tags=["elevenlabs"])


@router.post("/tools/{tool_name}", response_model=ToolCallOutput)
async def invoke_tool(
    tool_name: str,
    request: Request,
    execute_tool: ExecuteToolUseCase = Depends(get_execute_tool_use_case),
) -> ToolCallOutput:
    """Endpoint invocado por ElevenLabs para cada tool call."""
    current_user = await get_current_user(
        authorization=request.headers.get("Authorization"),
        users=get_user_repository(),
        tokens=get_token_service(),
        blacklist=get_token_blacklist(),
    )
    payload = ToolCallInput.model_validate(await request.json())
    sessions = get_session_repository()

    session = await sessions.get_by_id_for_technician(
        payload.session_id,
        technician_id=current_user.id,
    )
    if session is None:
        raise NotFoundError(
            code="SESSION_NOT_FOUND",
            message="Sesión no encontrada o no pertenece al técnico.",
            details={"id": payload.session_id},
        )

    if payload.tool_name and payload.tool_name != tool_name:
        raise ForbiddenError(
            code="VALIDATION_ERROR",
            message="tool_name en path y body no coinciden.",
        )

    result = await execute_tool.execute(
        tool_name=tool_name,
        session_id=payload.session_id,
        arguments=payload.arguments,
        current_user=current_user,
        call_id=payload.call_id,
    )
    return ToolCallOutput(call_id=payload.call_id, result=result)
