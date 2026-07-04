"""Estados de manual e indexación — BE-05."""

from enum import StrEnum


class ManualStatus(StrEnum):
    """Estado operativo del manual."""

    ACTIVE = "active"
    ARCHIVED = "archived"
    INDEXING = "indexing"
    ERROR = "error"


class IndexStatus(StrEnum):
    """Estado del pipeline de indexación."""

    PENDING = "pending"
    INDEXED = "indexed"
    FAILED = "failed"
