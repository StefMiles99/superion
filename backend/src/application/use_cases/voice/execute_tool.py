"""Use case ExecuteTool — BE-06."""

from __future__ import annotations

from domain.entities.user import User
from domain.exceptions import NotFoundError, ValidationError


class ExecuteToolUseCase:
    """Router tool_name → use case de dominio."""

    SUPPORTED_TOOLS = frozenset({
        "query_manual",
        "mark_step_complete",
        "request_evidence_photo",
        "add_finding",
        "add_measurement",
        "skip_step",
        "pause_session",
    })

    def __init__(
        self,
        *,
        query_manual,
        mark_step_complete,
        request_photo,
        add_finding,
        add_measurement,
        transition_step,
        pause_session,
    ) -> None:
        self._query_manual = query_manual
        self._mark_step_complete = mark_step_complete
        self._request_photo = request_photo
        self._add_finding = add_finding
        self._add_measurement = add_measurement
        self._transition = transition_step
        self._pause_session = pause_session

    async def execute(
        self,
        *,
        tool_name: str,
        session_id: str,
        arguments: dict[str, object],
        current_user: User,
        call_id: str | None = None,
    ) -> dict[str, object]:
        if tool_name not in self.SUPPORTED_TOOLS:
            raise ValidationError(
                code="VALIDATION_ERROR",
                message=f"Tool no soportado: {tool_name}.",
                details={"tool_name": tool_name},
            )

        if tool_name == "query_manual":
            question = str(arguments.get("question", ""))
            asset_id = arguments.get("asset_id")
            return await self._query_manual.execute(
                session_id=session_id,
                question=question,
                current_user=current_user,
                asset_id=str(asset_id) if asset_id is not None else None,
                call_id=call_id,
            )

        if tool_name == "mark_step_complete":
            step_index = arguments.get("step_index")
            parsed_step = int(step_index) if step_index is not None else None
            return await self._mark_step_complete.execute(
                session_id=session_id,
                step_index=parsed_step,
                current_user=current_user,
                call_id=call_id,
            )

        if tool_name == "request_evidence_photo":
            step_index = int(arguments["step_index"])
            criteria = str(arguments.get("criteria", ""))
            return await self._request_photo.execute(
                session_id=session_id,
                step_index=step_index,
                criteria=criteria,
                current_user=current_user,
                call_id=call_id,
            )

        if tool_name == "add_finding":
            return await self._add_finding.execute(
                session_id=session_id,
                text=str(arguments.get("text", "")),
                severity=str(arguments.get("severity", "med")),
                current_user=current_user,
                call_id=call_id,
            )

        if tool_name == "add_measurement":
            return await self._add_measurement.execute(
                session_id=session_id,
                name=str(arguments.get("name", "medicion")),
                value=float(arguments["value"]),
                unit=str(arguments["unit"]),
                current_user=current_user,
                call_id=call_id,
            )

        if tool_name == "skip_step":
            step_index = int(arguments["step_index"])
            reason = str(arguments.get("reason", "voice"))
            await self._transition.skip_step(
                session_id=session_id,
                step_index=step_index,
                reason=reason,
                current_user=current_user,
            )
            return {"ok": True}

        if tool_name == "pause_session":
            await self._pause_session.execute(
                session_id=session_id,
                current_user=current_user,
                reason="voice",
            )
            return {"ok": True}

        raise NotFoundError(
            code="NOT_FOUND",
            message=f"Tool no implementado: {tool_name}.",
        )
