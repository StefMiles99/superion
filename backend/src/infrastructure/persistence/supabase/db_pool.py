"""Pool asyncpg compartido para adapters Supabase."""

from __future__ import annotations

import asyncpg

_pool: asyncpg.Pool | None = None
_pool_dsn: str | None = None


async def get_db_pool(dsn: str) -> asyncpg.Pool:
    """Devuelve pool singleton; recrea si cambia el DSN."""
    global _pool, _pool_dsn
    if _pool is not None and _pool_dsn == dsn:
        return _pool
    if _pool is not None:
        await _pool.close()
    _pool = await asyncpg.create_pool(
        dsn,
        min_size=1,
        max_size=10,
        command_timeout=30,
        statement_cache_size=0,
    )
    _pool_dsn = dsn
    return _pool


async def reset_db_pool() -> None:
    """Cierra el pool — útil en tests."""
    global _pool, _pool_dsn
    if _pool is not None:
        await _pool.close()
    _pool = None
    _pool_dsn = None
