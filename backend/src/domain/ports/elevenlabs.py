"""Ports ElevenLabs — BE-09."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import Protocol

from domain.entities.agent_manifest import AgentManifest
from domain.entities.agent_tool_spec import AgentToolSpec
from domain.entities.provision_state import ProvisionState


@dataclass(frozen=True, slots=True)
class VoiceConnectResult:
    """Credenciales para iniciar conversación de voz."""

    agent_id: str
    connect_mode: str
    signed_url: str
    expires_at: datetime
    dynamic_variables: dict[str, str]


class IElevenLabsProvisioner(Protocol):
    """Provisiona tools, agente y deployment en ElevenLabs."""

    async def ensure_tools(
        self,
        tools: list[AgentToolSpec],
        *,
        api_base_url: str,
        existing_tool_ids: dict[str, str],
    ) -> dict[str, str]:
        """Crea o actualiza tools; devuelve name → tool_id."""

    async def ensure_agent(
        self,
        manifest: AgentManifest,
        *,
        tool_ids: dict[str, str],
        agent_id: str | None,
    ) -> str:
        """Crea o actualiza agente; devuelve agent_id."""

    async def deploy(
        self,
        agent_id: str,
        *,
        branch: str,
        traffic_percentage: float,
        environment: str,
        branch_id: str | None,
    ) -> ProvisionState:
        """Publica agente; devuelve estado actualizado."""


class IElevenLabsConversationClient(Protocol):
    """Obtiene credenciales de conversación sin exponer API key al cliente."""

    async def get_signed_url(
        self,
        agent_id: str,
        *,
        session_id: str,
        dynamic_variables: dict[str, str],
    ) -> VoiceConnectResult:
        """Devuelve signed_url WebSocket para la sesión."""
