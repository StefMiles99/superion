"""Mock LangGraph client — mini state machine — BE-06."""

from __future__ import annotations

import asyncio
from dataclasses import dataclass, replace

from application.use_cases.voice.execute_tool import ExecuteToolUseCase
from domain.entities.user import User
from domain.exceptions import ServiceUnavailableError


@dataclass
class GraphState:
    """Estado mínimo por sesión."""

    current_step_index: int
    status: str
    last_action: str | None = None


class MockLangGraphClient:
    """State machine in-memory — thread_id = session_id."""

    _instance: MockLangGraphClient | None = None

    def __init__(self, execute_tool: ExecuteToolUseCase | None = None) -> None:
        self._states: dict[str, GraphState] = {}
        self._execute_tool = execute_tool
        self._lock = asyncio.Lock()

    @classmethod
    def reset_singleton(cls) -> None:
        cls._instance = None

    @classmethod
    def shared(cls, execute_tool: ExecuteToolUseCase | None = None) -> MockLangGraphClient:
        if cls._instance is None:
            cls._instance = cls(execute_tool=execute_tool)
        elif execute_tool is not None:
            cls._instance._execute_tool = execute_tool
        return cls._instance

    async def ensure_session(self, session_id: str, *, current_step_index: int = 0) -> None:
        async with self._lock:
            if session_id not in self._states:
                self._states[session_id] = GraphState(
                    current_step_index=current_step_index,
                    status="active",
                )

    async def get_state(self, session_id: str) -> dict[str, object] | None:
        async with self._lock:
            state = self._states.get(session_id)
            if state is None:
                return None
            return {
                "current_step_index": state.current_step_index,
                "status": state.status,
                "last_action": state.last_action,
            }

    async def invoke(
        self,
        *,
        session_id: str,
        tool_name: str,
        arguments: dict[str, object],
        current_user: object,
    ) -> dict[str, object]:
        if self._execute_tool is None:
            raise ServiceUnavailableError(
                code="LANGGRAPH_UNAVAILABLE",
                message="LangGraph mock no configurado.",
            )

        if not isinstance(current_user, User):
            raise ServiceUnavailableError(
                code="LANGGRAPH_UNAVAILABLE",
                message="Usuario inválido para LangGraph.",
            )

        await self.ensure_session(session_id)
        result = await self._execute_tool.execute(
            tool_name=tool_name,
            session_id=session_id,
            arguments=arguments,
            current_user=current_user,
        )

        async with self._lock:
            state = self._states[session_id]
            updated = replace(state, last_action=tool_name)
            if tool_name == "mark_step_complete" and result.get("ok"):
                updated = replace(
                    updated,
                    current_step_index=state.current_step_index + 1,
                )
            if tool_name == "pause_session":
                updated = replace(updated, status="paused")
            self._states[session_id] = updated

        return result

    async def reset(self) -> None:
        async with self._lock:
            self._states.clear()
