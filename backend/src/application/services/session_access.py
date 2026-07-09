"""Resolución de acceso a sesiones — técnico titular o supervisor/planta."""

from __future__ import annotations

from domain.entities.maintenance_session import MaintenanceSession
from domain.entities.user import User
from domain.exceptions import ForbiddenError, NotFoundError
from domain.ports.repositories import ISessionRepository, IUserRepository
from domain.value_objects.role import Role


async def resolve_session_for_user(
    *,
    sessions: ISessionRepository,
    users: IUserRepository,
    session_id: str,
    current_user: User,
) -> MaintenanceSession:
    """Devuelve la sesión si el usuario es titular o supervisor/rag_admin de la planta."""
    session = await sessions.get_by_id(session_id)
    if session is None:
        raise NotFoundError(
            code="SESSION_NOT_FOUND",
            message="Sesión no encontrada.",
            details={"id": session_id},
        )

    if session.technician_id == current_user.id:
        return session

    if current_user.role in (Role.SUPERVISOR, Role.RAG_ADMIN):
        technician = await users.get_by_id(session.technician_id)
        if technician is not None and technician.plant_id == current_user.plant_id:
            return session

    raise ForbiddenError(
        code="FORBIDDEN",
        message="No tienes acceso a esta sesión.",
    )
