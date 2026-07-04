"""Use case GetMe — BE-01."""

from __future__ import annotations

from application.dto.auth import MeOutput
from domain.exceptions import NotFoundError
from domain.ports.repositories import IUserRepository


class GetMeUseCase:
    """Devuelve datos del usuario autenticado."""

    def __init__(self, *, users: IUserRepository) -> None:
        self._users = users

    async def execute(self, user_id: str) -> MeOutput:
        user = await self._users.get_by_id(user_id)
        if user is None:
            raise NotFoundError(
                code="NOT_FOUND",
                message="Usuario no encontrado.",
            )
        return MeOutput(
            id=user.id,
            email=user.email,
            full_name=user.full_name,
            role=user.role.value,
            plant_id=user.plant_id,
        )
