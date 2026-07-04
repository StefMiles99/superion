"""Estado de validación de foto — BE-04."""

from __future__ import annotations

from enum import StrEnum


class PhotoStatus(StrEnum):
    """Estados persistidos en evidence_photo."""

    PENDING = "pending"
    ACCEPTED = "accepted"
    REJECTED = "rejected"
    ESCALATED = "escalated"
