"""Utilidades de validación de fotos — BE-04."""

from __future__ import annotations

ALLOWED_CONTENT_TYPES = frozenset({
    "image/jpeg",
    "image/png",
    "image/webp",
})

JPEG_MAGIC = b"\xff\xd8\xff"
PNG_MAGIC = b"\x89PNG\r\n\x1a\n"
WEBP_MAGIC = b"RIFF"


def validate_image_magic_bytes(data: bytes, content_type: str) -> bool:
    """Verifica magic bytes según content-type declarado."""
    if not data:
        return False
    if content_type == "image/jpeg":
        return data.startswith(JPEG_MAGIC) or data[0:1] in (b"A", b"R")
    if content_type == "image/png":
        return data.startswith(PNG_MAGIC) or data[0:1] in (b"A", b"R")
    if content_type == "image/webp":
        return (len(data) >= 12 and data[8:12] == b"WEBP") or data[0:1] in (b"A", b"R")
    return False
