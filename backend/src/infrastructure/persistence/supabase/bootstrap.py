"""Bootstrap DB al arrancar la API — Cloud Run / Supabase."""

from __future__ import annotations

import logging

from infrastructure.config import Settings
from infrastructure.persistence.supabase.migrate import bootstrap_database

logger = logging.getLogger(__name__)


async def maybe_bootstrap_on_startup(settings: Settings) -> None:
    """Ejecuta migración/seed si PERSISTENCE=supabase y flags activos."""
    if settings.PERSISTENCE != "supabase":
        return
    if not settings.DATABASE_URL:
        logger.warning("PERSISTENCE=supabase sin DATABASE_URL — skip bootstrap")
        return
    if not settings.DB_AUTO_MIGRATE and not settings.DB_AUTO_SEED and not settings.DB_RESET_ON_STARTUP:
        return

    logger.info(
        "Bootstrap DB: migrate=%s seed=%s reset=%s",
        settings.DB_AUTO_MIGRATE,
        settings.DB_AUTO_SEED,
        settings.DB_RESET_ON_STARTUP,
    )
    await bootstrap_database(
        settings.DATABASE_URL,
        migrate=settings.DB_AUTO_MIGRATE or settings.DB_RESET_ON_STARTUP,
        seed=settings.DB_AUTO_SEED,
        reset=settings.DB_RESET_ON_STARTUP,
    )
