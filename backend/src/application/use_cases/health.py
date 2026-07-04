"""Use case de health check — BE-00."""

from __future__ import annotations


class HealthCheck:
    """Devuelve estado de liveness del servicio."""

    def __init__(self, *, version: str) -> None:
        self._version = version

    async def execute(self) -> dict[str, object]:
        return {
            "status": "ok",
            "version": self._version,
            "deps": {},
        }
