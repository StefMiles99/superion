"""Use case ListPlantSessions — supervisor/rag_admin."""

from __future__ import annotations

from application.dto.session_list import SessionListItemOutput, SessionListOutput
from domain.entities.user import User
from domain.exceptions import ForbiddenError
from domain.ports.repositories import (
    IAssetRepository,
    ISessionRepository,
    IUserRepository,
    IWorkOrderRepository,
)
from domain.value_objects.role import Role


class ListPlantSessionsUseCase:
    """Lista sesiones recientes de la planta (solo supervisor/rag_admin)."""

    def __init__(
        self,
        *,
        sessions: ISessionRepository,
        work_orders: IWorkOrderRepository,
        assets: IAssetRepository,
        users: IUserRepository,
    ) -> None:
        self._sessions = sessions
        self._work_orders = work_orders
        self._assets = assets
        self._users = users

    async def execute(
        self,
        *,
        current_user: User,
        limit: int = 50,
    ) -> SessionListOutput:
        if current_user.role not in (Role.SUPERVISOR, Role.RAG_ADMIN):
            raise ForbiddenError(
                code="FORBIDDEN",
                message="Solo supervisores pueden listar sesiones de planta.",
            )

        plant_sessions = await self._sessions.list_for_plant(
            plant_id=current_user.plant_id,
            limit=limit,
        )

        items: list[SessionListItemOutput] = []
        for session in plant_sessions:
            order = await self._work_orders.get_by_id_for_technician(
                session.work_order_id,
                technician_id=session.technician_id,
            )
            if order is None:
                continue

            asset = await self._assets.get_by_id(order.asset_id)
            technician = await self._users.get_by_id(session.technician_id)
            ended_at: str | None = None
            if session.ended_at is not None:
                ended_at = session.ended_at.isoformat().replace("+00:00", "Z")

            items.append(
                SessionListItemOutput(
                    id=session.id,
                    work_order_id=session.work_order_id,
                    work_order_code=order.code,
                    asset_name=asset.name if asset else "—",
                    technician_name=technician.full_name if technician else "—",
                    status=session.status.value,
                    started_at=session.started_at.isoformat().replace("+00:00", "Z"),
                    ended_at=ended_at,
                )
            )

        return SessionListOutput(items=items)
