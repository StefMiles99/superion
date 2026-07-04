"""Use case Refresh — BE-01."""

from __future__ import annotations

from application.dto.auth import LoginOutput, RefreshInput, UserOutput
from domain.exceptions import UnauthorizedError
from domain.ports.repositories import ITokenBlacklist, IUserRepository
from domain.ports.services import ITokenService
from domain.services.token_service import InvalidTokenError, TokenExpiredError


class RefreshUseCase:
    """Rota refresh token y emite nuevo access."""

    def __init__(
        self,
        *,
        users: IUserRepository,
        tokens: ITokenService,
        blacklist: ITokenBlacklist,
        access_ttl_seconds: int = 3600,
    ) -> None:
        self._users = users
        self._tokens = tokens
        self._blacklist = blacklist
        self._access_ttl_seconds = access_ttl_seconds

    async def execute(self, input_data: RefreshInput) -> LoginOutput:
        try:
            payload = self._tokens.decode_refresh_token(input_data.refresh_token)
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
        if await self._blacklist.is_revoked(jti):
            raise UnauthorizedError(
                code="UNAUTHORIZED",
                message="Token revocado.",
            )

        user = await self._users.get_by_id(str(payload["sub"]))
        if user is None or user.is_blocked:
            raise UnauthorizedError(
                code="UNAUTHORIZED",
                message="Usuario no autorizado.",
            )

        await self._blacklist.revoke(jti)
        access = self._tokens.create_access_token(user)
        refresh = self._tokens.create_refresh_token(user)
        await self._blacklist.register_refresh(user.id, refresh.jti)

        return LoginOutput(
            access_token=access.value,
            refresh_token=refresh.value,
            expires_in=self._access_ttl_seconds,
            user=UserOutput(
                id=user.id,
                email=user.email,
                full_name=user.full_name,
                role=user.role.value,
                plant_id=user.plant_id,
            ),
        )
