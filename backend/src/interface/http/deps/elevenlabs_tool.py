"""Auth de tool calls ElevenLabs — BE-06."""

from __future__ import annotations

import hmac

from domain.entities.user import User
from domain.exceptions import NotFoundError, UnauthorizedError
from domain.ports.repositories import ISessionRepository, IUserRepository
from infrastructure.config import Settings
from interface.http.deps.auth import get_current_user


async def resolve_tool_caller(
    *,
    authorization: str | None,
    tool_auth_header: str | None,
    tool_auth_query: str | None,
    session_id: str,
    settings: Settings,
    users: IUserRepository,
    sessions: ISessionRepository,
    tokens,
    blacklist,
) -> User:
    """Resuelve técnico vía JWT (tests) o secret compartido (ElevenLabs webhook)."""
    if authorization and authorization.startswith("Bearer "):
        return await get_current_user(
            authorization=authorization,
            users=users,
            tokens=tokens,
            blacklist=blacklist,
        )

    expected = settings.ELEVENLABS_WEBHOOK_SECRET
    provided = tool_auth_header or tool_auth_query
    if provided and expected and hmac.compare_digest(provided, expected):
        session = await sessions.get_by_id(session_id)
        if session is None:
            raise NotFoundError(
                code="SESSION_NOT_FOUND",
                message="Sesión no encontrada.",
                details={"id": session_id},
            )
        user = await users.get_by_id(session.technician_id)
        if user is None:
            raise NotFoundError(
                code="NOT_FOUND",
                message="Técnico de la sesión no encontrado.",
                details={"technician_id": session.technician_id},
            )
        if user.is_blocked:
            raise UnauthorizedError(
                code="UNAUTHORIZED",
                message="Usuario bloqueado.",
            )
        return user

    raise UnauthorizedError(
        code="UNAUTHORIZED",
        message="Autenticación de tool call inválida.",
    )
