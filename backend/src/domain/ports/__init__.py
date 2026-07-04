"""Ports del dominio — placeholders para planes posteriores."""

from __future__ import annotations

from typing import Protocol


class IUnitOfWork(Protocol):
    """Unidad de trabajo transaccional — placeholder BE-00."""

    async def commit(self) -> None: ...

    async def rollback(self) -> None: ...
