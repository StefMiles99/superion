"""CLI — migrar, seed y reset de Postgres/Supabase."""

from __future__ import annotations

import argparse
import asyncio

from infrastructure.config import Settings
from infrastructure.persistence.supabase.migrate import (
    bootstrap_database,
    reset_database,
    run_migrations,
    seed_fixtures,
)


def main() -> None:
    parser = argparse.ArgumentParser(description="Administrar base Postgres SUPERION")
    parser.add_argument("--dsn", default="", help="DATABASE_URL (default: env)")
    sub = parser.add_subparsers(dest="command", required=True)

    sub.add_parser("migrate", help="Aplicar migraciones SQL")
    sub.add_parser("seed", help="Sembrar fixtures demo")
    bootstrap_p = sub.add_parser("bootstrap", help="Migrar + seed")
    bootstrap_p.add_argument("--reset", action="store_true", help="TRUNCATE antes de migrar")

    reset_p = sub.add_parser("reset", help="TRUNCATE + migrar + seed")
    reset_p.add_argument(
        "--confirm",
        action="store_true",
        help="Requerido para ejecutar reset destructivo",
    )

    args = parser.parse_args()
    settings = Settings()
    dsn = args.dsn or settings.DATABASE_URL
    if not dsn:
        raise SystemExit("DATABASE_URL requerido (env o --dsn)")

    if args.command == "migrate":
        asyncio.run(run_migrations(dsn))
        print("Migraciones aplicadas.")
    elif args.command == "seed":
        asyncio.run(seed_fixtures(dsn))
        print("Seed completado.")
    elif args.command == "bootstrap":
        asyncio.run(
            bootstrap_database(
                dsn,
                migrate=True,
                seed=True,
                reset=args.reset,
            )
        )
        print("Bootstrap completado.")
    elif args.command == "reset":
        if not args.confirm:
            raise SystemExit("Usa --confirm para reset destructivo")
        asyncio.run(
            bootstrap_database(
                dsn,
                migrate=True,
                seed=True,
                reset=True,
            )
        )
        print("Reset + bootstrap completado.")


if __name__ == "__main__":
    main()
