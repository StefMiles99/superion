"""Persistencia local de state.json — BE-09."""

from __future__ import annotations

import json
from datetime import UTC, datetime
from pathlib import Path

from domain.entities.provision_state import ProvisionState
from domain.exceptions import ValidationError
from domain.value_objects.provision_status import ProvisionStatus


class JsonStateStore:
    """Lee/escribe ProvisionState en JSON atómico."""

    def __init__(self, path: Path) -> None:
        self._path = path

    def load(self) -> ProvisionState | None:
        if not self._path.exists():
            return None
        raw = json.loads(self._path.read_text(encoding="utf-8"))
        deployed_at = raw.get("deployed_at")
        return ProvisionState(
            agent_id=raw["agent_id"],
            branch_id=raw["branch_id"],
            tool_ids=dict(raw.get("tool_ids", {})),
            environment=raw["environment"],
            status=ProvisionStatus(raw["status"]),
            deployed_at=datetime.fromisoformat(deployed_at) if deployed_at else None,
        )

    def save(self, state: ProvisionState) -> None:
        self._path.parent.mkdir(parents=True, exist_ok=True)
        payload = {
            "agent_id": state.agent_id,
            "branch_id": state.branch_id,
            "tool_ids": state.tool_ids,
            "environment": state.environment,
            "status": state.status.value,
            "deployed_at": state.deployed_at.astimezone(UTC).isoformat()
            if state.deployed_at
            else None,
        }
        self._path.write_text(json.dumps(payload, indent=2), encoding="utf-8")

    def require(self) -> ProvisionState:
        state = self.load()
        if state is None:
            raise ValidationError(
                code="AGENT_NOT_PROVISIONED",
                message="El agente ElevenLabs no está provisionado.",
            )
        return state
