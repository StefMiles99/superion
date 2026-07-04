"""Use case Login — BE-01."""

from __future__ import annotations

from application.decorators.audit import audit
from application.dto.auth import LoginInput, LoginOutput, UserOutput
from domain.exceptions import UnauthorizedError
from domain.ports.repositories import ITokenBlacklist, IUserRepository
from domain.ports.services import IPasswordHasher, ITokenService
from domain.value_objects.action import AuditAction


class LoginUseCase:
    """Valida credenciales y emite tokens."""

    def __init__(
        self,
        *,
        users: IUserRepository,
        hasher: IPasswordHasher,
        tokens: ITokenService,
        blacklist: ITokenBlacklist,
        access_ttl_seconds: int = 3600,
    ) -> None:
        self._users = users
        self._hasher = hasher
        self._tokens = tokens
        self._blacklist = blacklist
        self._access_ttl_seconds = access_ttl_seconds

    @audit(AuditAction.LOGIN, target_type="user")
    async def execute(self, input_data: LoginInput) -> LoginOutput:
        user = await self._users.get_by_email(str(input_data.email))
        if user is None or user.is_blocked:
            raise UnauthorizedError(
                code="INVALID_CREDENTIALS",
                message="Credenciales inválidas.",
            )

        if not self._hasher.verify(input_data.password, user.password_hash):
            raise UnauthorizedError(
                code="INVALID_CREDENTIALS",
                message="Credenciales inválidas.",
            )

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
