"""Use case ToolQueryManual — BE-06."""

from __future__ import annotations

from uuid import uuid4

from application.use_cases.events.append import AppendEventUseCase
from application.use_cases.rag.query import RagQueryUseCase
from domain.entities.user import User
from domain.exceptions import NotFoundError
from domain.ports.repositories import (
    IAssetRepository,
    ISessionRepository,
    IWorkOrderRepository,
)


class ToolQueryManualUseCase:
    """Invoca RAG y emite eventos assistant.answering / assistant.answered."""

    def __init__(
        self,
        *,
        sessions: ISessionRepository,
        work_orders: IWorkOrderRepository,
        assets: IAssetRepository,
        rag_query: RagQueryUseCase,
        append_events: AppendEventUseCase,
    ) -> None:
        self._sessions = sessions
        self._work_orders = work_orders
        self._assets = assets
        self._rag = rag_query
        self._append = append_events

    async def execute(
        self,
        *,
        session_id: str,
        question: str,
        current_user: User,
        asset_id: str | None = None,
        call_id: str | None = None,
    ) -> dict[str, object]:
        session = await self._sessions.get_by_id_for_technician(
            session_id,
            technician_id=current_user.id,
        )
        if session is None:
            raise NotFoundError(
                code="SESSION_NOT_FOUND",
                message="Sesión no encontrada.",
                details={"id": session_id},
            )

        resolved_asset_id = asset_id
        if resolved_asset_id is None:
            order = await self._work_orders.get_by_id_for_technician(
                session.work_order_id,
                technician_id=current_user.id,
            )
            if order is None:
                raise NotFoundError(
                    code="WORK_ORDER_NOT_FOUND",
                    message="Orden de trabajo no encontrada.",
                )
            resolved_asset_id = order.asset_id

        asset = await self._assets.get_by_id(resolved_asset_id)
        if asset is None:
            raise NotFoundError(
                code="NOT_FOUND",
                message="Activo no encontrado.",
                details={"id": resolved_asset_id},
            )

        step_index = session.current_step_index
        await self._append.emit_system_event(
            session_id=session_id,
            event_type="assistant.answering",
            step_index=step_index,
            payload={"step_index": step_index, "query": question},
        )

        tool_call_id = call_id or str(uuid4())
        await self._append.emit_system_event(
            session_id=session_id,
            event_type="tool.called",
            step_index=step_index,
            payload={
                "tool_name": "query_manual",
                "arguments": {"question": question, "asset_id": resolved_asset_id},
                "call_id": tool_call_id,
            },
        )

        rag_result = await self._rag.execute(
            question=question,
            asset_id=resolved_asset_id,
            asset_model=asset.model,
        )

        citations = [
            {
                "manual_id": c.manual_id,
                "manual_version": c.manual_version,
                "page": c.page,
                "section_path": c.section_path,
                "chunk_id": c.chunk_id,
                "snippet": c.snippet,
            }
            for c in rag_result.citations
        ]

        await self._append.emit_system_event(
            session_id=session_id,
            event_type="assistant.answered",
            step_index=step_index,
            payload={
                "step_index": step_index,
                "query": question,
                "answer_text": rag_result.answer,
                "citations": citations,
                "confidence": rag_result.confidence,
            },
        )

        return {
            "answer": rag_result.answer,
            "citations": citations,
            "confidence": rag_result.confidence,
            "abstained": rag_result.abstained,
        }
