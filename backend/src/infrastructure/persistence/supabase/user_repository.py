"""Adapter Supabase UserRepository — BE-01."""

from __future__ import annotations

from domain.entities.user import User
from infrastructure.persistence.supabase.base import SupabaseRepository
from infrastructure.persistence.supabase.mappers import user_from_row


class SupabaseUserRepository(SupabaseRepository):
    """Usuarios en tabla app_user."""

    async def get_by_id(self, user_id: str) -> User | None:
        pool = await self._pool()
        async with pool.acquire() as conn:
            row = await conn.fetchrow(
                "SELECT * FROM app_user WHERE id = $1",
                user_id,
            )
            return user_from_row(row) if row else None

    async def get_by_email(self, email: str) -> User | None:
        pool = await self._pool()
        async with pool.acquire() as conn:
            row = await conn.fetchrow(
                "SELECT * FROM app_user WHERE email = $1",
                email,
            )
            return user_from_row(row) if row else None
