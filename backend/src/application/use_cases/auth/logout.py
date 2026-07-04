"""Use case Logout — BE-01."""

from __future__ import annotations

from domain.exceptions import UnauthorizedError
from domain.ports.repositories import ITokenBlacklist
from domain.ports.services import ITokenService
from domain.services.token_service import InvalidTokenError, TokenExpiredError


class LogoutUseCase:
    """Revoca tokens del usuario autenticado."""

    def __init__(
        self,
        *,
        tokens: ITokenService,
        blacklist: ITokenBlacklist,
    ) -> None:
        self._tokens = tokens
        self._blacklist = blacklist

    async def execute(self, *, access_token: str) -> None:
        try:
            payload = self._tokens.decode_access_token(access_token)
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

        user_id = str(payload["sub"])
        access_jti = str(payload["jti"])
        await self._blacklist.revoke(access_jti)
        await self._blacklist.revoke_all_for_user(user_id)
