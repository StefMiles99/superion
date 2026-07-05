"""Base para repositorios Supabase/Postgres."""

from __future__ import annotations

import asyncpg

from infrastructure.persistence.supabase.db_pool import get_db_pool


class SupabaseRepository:
    """Acceso compartido al pool asyncpg."""

    def __init__(self, *, dsn: str) -> None:
        if not dsn:
            msg = "DATABASE_URL requerido para repositorios Supabase"
            raise ValueError(msg)
        self._dsn = dsn

    async def _pool(self) -> asyncpg.Pool:
        return await get_db_pool(self._dsn)
