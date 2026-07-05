"""Value objects de provisionamiento ElevenLabs — BE-09."""

from __future__ import annotations

from enum import StrEnum


class ProvisionStatus(StrEnum):
    """Estado del ciclo provision → deploy."""

    DRAFT = "draft"
    SYNCED = "synced"
    DEPLOYED = "deployed"
    FAILED = "failed"
