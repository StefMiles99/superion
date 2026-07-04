"""Stub Supabase user repository — BE-01."""

from __future__ import annotations

from domain.entities.user import User


class SupabaseUserRepository:
    """Stub hasta activar supabase_auth."""

    async def get_by_id(self, user_id: str) -> User | None:
        raise NotImplementedError(
            "SupabaseUserRepository.get_by_id — implementar al activar supabase_auth"
        )

    async def get_by_email(self, email: str) -> User | None:
        raise NotImplementedError(
            "SupabaseUserRepository.get_by_email — implementar al activar supabase_auth"
        )
