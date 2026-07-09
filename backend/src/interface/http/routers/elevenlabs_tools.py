"""Router tools ElevenLabs — BE-06."""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, Header, Request
from fastapi.responses import JSONResponse

from application.dto.elevenlabs_tool_call import ToolCallOutput, parse_tool_call_body
from application.use_cases.voice.execute_tool import ExecuteToolUseCase
from domain.exceptions import ForbiddenError, NotFoundError, ValidationError
from infrastructure.config import Settings
from infrastructure.factories import (
    get_execute_tool_use_case,
    get_session_repository,
    get_settings,
    get_token_blacklist,
    get_token_service,
    get_user_repository,
)
from interface.http.deps.elevenlabs_tool import resolve_tool_caller

router = APIRouter(prefix="/v1/elevenlabs", tags=["elevenlabs"])


def _elevenlabs_request(request: Request) -> bool:
    if request.query_params.get("tool_auth"):
        return True
    return request.headers.get("X-Superion-Tool-Auth") is not None


@router.post("/tools/{tool_name}")
async def invoke_tool(
    tool_name: str,
    request: Request,
    tool_auth: Annotated[str | None, Header(alias="X-Superion-Tool-Auth")] = None,
    execute_tool: ExecuteToolUseCase = Depends(get_execute_tool_use_case),
    settings: Settings = Depends(get_settings),
):
    """Endpoint invocado por ElevenLabs para cada tool call."""
    try:
        raw = await request.json()
    except Exception:
        raw = {}
    if not isinstance(raw, dict):
        raise ValidationError(
            code="VALIDATION_ERROR",
            message="Body JSON inválido.",
        )

    session_id = request.query_params.get("session_id")
    if session_id and "session_id" not in raw:
        raw = {**raw, "session_id": session_id}
    if "parameters" in raw and isinstance(raw["parameters"], dict):
        params = dict(raw["parameters"])
        if session_id and "session_id" not in params:
            params["session_id"] = session_id
        raw["parameters"] = params

    normalized = parse_tool_call_body(raw)
    resolved_session_id = request.query_params.get("session_id") or normalized.session_id
    users = get_user_repository()
    sessions = get_session_repository()

    current_user = await resolve_tool_caller(
        authorization=request.headers.get("Authorization"),
        tool_auth_header=tool_auth,
        tool_auth_query=request.query_params.get("tool_auth"),
        session_id=resolved_session_id,
        settings=settings,
        users=users,
        sessions=sessions,
        tokens=get_token_service(),
        blacklist=get_token_blacklist(),
    )

    session = await sessions.get_by_id_for_technician(
        resolved_session_id,
        technician_id=current_user.id,
    )
    if session is None:
        raise NotFoundError(
            code="SESSION_NOT_FOUND",
            message="Sesión no encontrada o no pertenece al técnico.",
            details={"id": resolved_session_id},
        )

    if normalized.tool_name and normalized.tool_name != tool_name:
        raise ForbiddenError(
            code="VALIDATION_ERROR",
            message="tool_name en path y body no coinciden.",
        )

    result = await execute_tool.execute(
        tool_name=tool_name,
        session_id=resolved_session_id,
        arguments=normalized.arguments,
        current_user=current_user,
        call_id=normalized.call_id,
    )

    if _elevenlabs_request(request):
        voice_result = result.get("summary", result)
        return JSONResponse({"result": voice_result})

    return ToolCallOutput(call_id=normalized.call_id, result=result)
