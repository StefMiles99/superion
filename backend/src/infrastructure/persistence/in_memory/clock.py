"""Reloj in-memory avanzable — BE-00."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta


class InMemoryClock:
    """Reloj determinista para tests."""

    _DEFAULT = datetime(2025, 1, 1, tzinfo=UTC)
    _instance: InMemoryClock | None = None

    def __init__(self, initial: datetime | None = None) -> None:
        self._current = initial or self._DEFAULT

    @classmethod
    def shared(cls) -> InMemoryClock:
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    def now(self) -> datetime:
        return self._current

    def advance(self, *, seconds: float = 0) -> None:
        self._current += timedelta(seconds=seconds)

    def set(self, dt: datetime) -> None:
        self._current = dt

    def reset(self) -> None:
        self._current = self._DEFAULT
