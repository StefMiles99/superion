"""Cliente LangGraph HTTP — BE-06."""

from __future__ import annotations

import httpx

from application.use_cases.voice.execute_tool import ExecuteToolUseCase
from domain.entities.user import User
from domain.exceptions import ServiceUnavailableError


class HttpLangGraphClient:
    """Proxy HTTP hacia servicio LangGraph; fallback a dispatch local si 404."""

    def __init__(
        self,
        *,
        base_url: str,
        execute_tool: ExecuteToolUseCase | None = None,
        timeout_seconds: float = 30.0,
    ) -> None:
        if not base_url:
            msg = "LANGGRAPH_URL requerido"
            raise ValueError(msg)
        self._base_url = base_url.rstrip("/")
        self._execute_tool = execute_tool
        self._timeout = timeout_seconds

    async def ensure_session(self, session_id: str, *, current_step_index: int = 0) -> None:
        url = f"{self._base_url}/v1/threads/{session_id}/ensure"
        async with httpx.AsyncClient(timeout=self._timeout) as client:
            response = await client.post(
                url,
                json={"current_step_index": current_step_index},
            )
            if response.status_code in (404, 501):
                return
            response.raise_for_status()

    async def get_state(self, session_id: str) -> dict[str, object] | None:
        url = f"{self._base_url}/v1/threads/{session_id}/state"
        async with httpx.AsyncClient(timeout=self._timeout) as client:
            response = await client.get(url)
            if response.status_code == 404:
                return None
            response.raise_for_status()
            body = response.json()
            if isinstance(body, dict):
                return body
            return None

    async def invoke(
        self,
        *,
        session_id: str,
        tool_name: str,
        arguments: dict[str, object],
        current_user: object,
    ) -> dict[str, object]:
        if not isinstance(current_user, User):
            raise ServiceUnavailableError(
                code="LANGGRAPH_UNAVAILABLE",
                message="Usuario inválido para LangGraph.",
            )

        url = f"{self._base_url}/v1/threads/{session_id}/invoke"
        async with httpx.AsyncClient(timeout=self._timeout) as client:
            response = await client.post(
                url,
                json={"tool_name": tool_name, "arguments": arguments},
            )
            if response.status_code in (404, 501) and self._execute_tool is not None:
                return await self._execute_tool.execute(
                    tool_name=tool_name,
                    session_id=session_id,
                    arguments=arguments,
                    current_user=current_user,
                )
            if response.status_code >= 400:
                raise ServiceUnavailableError(
                    code="LANGGRAPH_UNAVAILABLE",
                    message="LangGraph no disponible.",
                    details={"status": response.status_code},
                )
            body = response.json()
            if isinstance(body, dict) and "result" in body:
                result = body["result"]
                if isinstance(result, dict):
                    return result
            if isinstance(body, dict):
                return body
            return {"ok": True}
