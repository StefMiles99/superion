"""Migraciones y seed Postgres/Supabase — BE-00."""

from __future__ import annotations

import logging
from datetime import UTC, datetime
from pathlib import Path

import asyncpg

from infrastructure.persistence.in_memory.asset_repository import InMemoryAssetRepository
from infrastructure.persistence.in_memory.procedure_template_repository import (
    InMemoryProcedureTemplateRepository,
)
from infrastructure.persistence.in_memory.user_repository import InMemoryUserRepository
from infrastructure.persistence.in_memory.work_order_repository import InMemoryWorkOrderRepository
from infrastructure.persistence.supabase.db_pool import reset_db_pool
from infrastructure.persistence.supabase.procedure_template_repository import (
    SupabaseProcedureTemplateRepository,
)
from infrastructure.persistence.supabase.work_order_repository import SupabaseWorkOrderRepository

logger = logging.getLogger(__name__)

# Supabase pooler (pgbouncer) requiere statement_cache_size=0.


async def _connect(dsn: str) -> asyncpg.Connection:
    return await asyncpg.connect(dsn, statement_cache_size=0)

_TRUNCATE_SQL = """
TRUNCATE TABLE
    audit_log,
    session_event,
    evidence_photo,
    maintenance_report,
    maintenance_session,
    work_order,
    procedure_template,
    manual_chunk,
    manual,
    asset,
    app_user,
    plant
CASCADE
"""


def resolve_migrations_dir() -> Path:
    """Resuelve directorio de migraciones (dev, Docker, o env)."""
    import os

    if override := os.environ.get("SUPABASE_MIGRATIONS_DIR", "").strip():
        path = Path(override)
        if path.is_dir():
            return path

    here = Path(__file__).resolve()
    candidates = [
        Path("/app/supabase/migrations"),
        here.parents[4] / "supabase" / "migrations",
        here.parents[5] / "supabase" / "migrations",
    ]
    for candidate in candidates:
        if candidate.is_dir() and any(candidate.glob("*.sql")):
            return candidate

    msg = "No se encontró directorio supabase/migrations"
    raise FileNotFoundError(msg)


async def run_migrations(dsn: str) -> None:
    """Aplica migraciones SQL idempotentes (CREATE IF NOT EXISTS)."""
    migrations_dir = resolve_migrations_dir()
    conn = await _connect(dsn)
    try:
        for path in sorted(migrations_dir.glob("*.sql")):
            logger.info("Aplicando migración %s", path.name)
            await conn.execute(path.read_text(encoding="utf-8"))
    finally:
        await conn.close()


async def reset_database(dsn: str) -> None:
    """Vacía tablas operativas — solo dev/demo."""
    await run_migrations(dsn)
    conn = await _connect(dsn)
    try:
        logger.warning("Reiniciando base: TRUNCATE CASCADE")
        await conn.execute(_TRUNCATE_SQL)
    finally:
        await conn.close()
        await reset_db_pool()


async def seed_fixtures(dsn: str) -> None:
    """Inserta fixtures demo (idempotente)."""
    conn = await _connect(dsn)
    try:
        await conn.execute(
            """
            INSERT INTO plant (id, name, location, created_at)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (id) DO NOTHING
            """,
            "plant-1",
            "Planta Norte",
            "Monterrey",
            datetime(2026, 1, 1, tzinfo=UTC),
        )

        users = InMemoryUserRepository.with_fixtures(password="test1234", rounds=10)
        for user in users._users_by_id.values():  # noqa: SLF001 — seed
            await conn.execute(
                """
                INSERT INTO app_user (
                    id, email, password_hash, full_name, role, plant_id, is_blocked
                ) VALUES ($1, $2, $3, $4, $5, $6, $7)
                ON CONFLICT (id) DO UPDATE SET
                    email = EXCLUDED.email,
                    password_hash = EXCLUDED.password_hash,
                    full_name = EXCLUDED.full_name,
                    role = EXCLUDED.role,
                    plant_id = EXCLUDED.plant_id,
                    is_blocked = EXCLUDED.is_blocked
                """,
                user.id,
                user.email,
                user.password_hash,
                user.full_name,
                user.role.value,
                user.plant_id,
                user.is_blocked,
            )

        assets = InMemoryAssetRepository.with_fixtures()
        for asset in assets._assets.values():  # noqa: SLF001
            await conn.execute(
                """
                INSERT INTO asset (
                    id, plant_id, tag, name, model, manufacturer, current_manual_id
                ) VALUES ($1, $2, $3, $4, $5, $6, $7)
                ON CONFLICT (id) DO UPDATE SET
                    tag = EXCLUDED.tag,
                    name = EXCLUDED.name,
                    model = EXCLUDED.model,
                    manufacturer = EXCLUDED.manufacturer,
                    current_manual_id = EXCLUDED.current_manual_id
                """,
                asset.id,
                asset.plant_id,
                asset.tag,
                asset.name,
                asset.model,
                asset.manufacturer,
                asset.current_manual_id or None,
            )
    finally:
        await conn.close()

    template_repo = SupabaseProcedureTemplateRepository(dsn=dsn)
    for template in InMemoryProcedureTemplateRepository.with_fixtures()._templates.values():  # noqa: SLF001
        await template_repo.save(template)

    wo_repo = SupabaseWorkOrderRepository(dsn=dsn)
    for order in InMemoryWorkOrderRepository.with_fixtures()._orders.values():  # noqa: SLF001
        await wo_repo.save(order)

    await reset_db_pool()
    logger.info("Seed de fixtures completado")


async def bootstrap_database(
    dsn: str,
    *,
    migrate: bool = True,
    seed: bool = True,
    reset: bool = False,
) -> None:
    """Migrar (+ opcional reset) y sembrar."""
    if reset:
        await reset_database(dsn)
    elif migrate:
        await run_migrations(dsn)
    if seed:
        await seed_fixtures(dsn)
