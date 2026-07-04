"""HTTP dependencies de auth — BE-01."""

from __future__ import annotations

from collections.abc import Callable
from typing import Annotated

from fastapi import Depends, Header

from domain.entities.user import User
from domain.exceptions import ForbiddenError, UnauthorizedError
from domain.ports.repositories import ITokenBlacklist, IUserRepository
from domain.ports.services import ITokenService
from domain.services.token_service import InvalidTokenError, TokenExpiredError
from domain.value_objects.role import Role
from infrastructure.factories import get_token_blacklist, get_token_service, get_user_repository


async def get_current_user(
    authorization: Annotated[str | None, Header()] = None,
    users: IUserRepository = Depends(get_user_repository),
    tokens: ITokenService = Depends(get_token_service),
    blacklist: ITokenBlacklist = Depends(get_token_blacklist),
) -> User:
    """Extrae usuario autenticado del JWT Bearer."""
    if authorization is None or not authorization.startswith("Bearer "):
        raise UnauthorizedError(
            code="UNAUTHORIZED",
            message="Autenticación requerida.",
        )

    token = authorization.removeprefix("Bearer ").strip()
    try:
        payload = tokens.decode_access_token(token)
    except TokenExpiredError as exc:
        raise UnauthorizedError(
            code="TOKEN_EXPIRED",
            message="Token expirado.",
        ) from exc
    except InvalidTokenError as exc:
        raise UnauthorizedError(
            code="UNAUTHORIZED",
            message="Token inválido.",
        ) from exc

    jti = str(payload["jti"])
    if await blacklist.is_revoked(jti):
        raise UnauthorizedError(
            code="UNAUTHORIZED",
            message="Token revocado.",
        )

    user = await users.get_by_id(str(payload["sub"]))
    if user is None or user.is_blocked:
        raise UnauthorizedError(
            code="UNAUTHORIZED",
            message="Usuario no autorizado.",
        )
    return user


def require_role(*roles: Role) -> Callable[..., User]:
    """Dependency factory que exige uno de los roles indicados."""

    allowed = set(roles)

    async def _require_role(user: User = Depends(get_current_user)) -> User:
        if user.role not in allowed:
            raise ForbiddenError(
                code="FORBIDDEN",
                message="No tienes permisos para esta operación.",
            )
        return user

    return _require_role
