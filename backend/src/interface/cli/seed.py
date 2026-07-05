"""CLI — migrar y sembrar Postgres/Supabase (alias de db bootstrap)."""

from __future__ import annotations

import argparse
import asyncio

from infrastructure.config import Settings
from infrastructure.persistence.supabase.migrate import bootstrap_database


def main() -> None:
    parser = argparse.ArgumentParser(description="Migrar y sembrar base Postgres SUPERION")
    parser.add_argument("--dsn", default="", help="DATABASE_URL (default: env DATABASE_URL)")
    parser.add_argument("--reset", action="store_true", help="TRUNCATE antes de migrar")
    args = parser.parse_args()
    settings = Settings()
    dsn = args.dsn or settings.DATABASE_URL
    if not dsn:
        raise SystemExit("DATABASE_URL requerido (env o --dsn)")

    asyncio.run(
        bootstrap_database(
            dsn,
            migrate=True,
            seed=True,
            reset=args.reset,
        )
    )
    print("Migración y seed completados.")


if __name__ == "__main__":
    main()
