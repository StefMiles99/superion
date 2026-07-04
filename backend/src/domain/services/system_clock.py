"""Reloj del sistema — BE-01."""

from __future__ import annotations

from datetime import UTC, datetime


class SystemClock:
    """Implementación real del puerto IClock."""

    def now(self) -> datetime:
        return datetime.now(UTC)
