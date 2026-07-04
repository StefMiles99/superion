"""Port de almacenamiento de objetos — BE-04."""

from __future__ import annotations

from typing import Protocol


class IObjectStorage(Protocol):
    """Almacenamiento de blobs (fotos, PDFs)."""

    async def put(self, key: str, data: bytes, *, content_type: str) -> str: ...

    async def get(self, key: str) -> bytes | None: ...

    async def get_signed_url(self, key: str, *, ttl_seconds: int = 900) -> str: ...
