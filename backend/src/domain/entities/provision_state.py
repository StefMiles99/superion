"""Estado persistido tras provision/deploy — BE-09."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime

from domain.value_objects.provision_status import ProvisionStatus


@dataclass(frozen=True, slots=True)
class ProvisionState:
    """IDs remotos y metadatos del agente provisionado."""

    agent_id: str
    branch_id: str
    tool_ids: dict[str, str]
    environment: str
    status: ProvisionStatus
    deployed_at: datetime | None = None

    def __post_init__(self) -> None:
        if not self.agent_id.strip():
            raise ValueError("agent_id no puede estar vacío")
