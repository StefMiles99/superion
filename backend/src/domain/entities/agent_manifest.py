"""Entidad AgentManifest — BE-09."""

from __future__ import annotations

from dataclasses import dataclass

from domain.entities.agent_tool_spec import AgentToolSpec


@dataclass(frozen=True, slots=True)
class AgentConfig:
    """Configuración conversacional del agente."""

    name: str
    tags: list[str]
    voice_id: str
    tts_model: str
    language: str
    first_message: str
    llm: str
    system_prompt: str
    tools: list[AgentToolSpec]
    variables: dict[str, str]


@dataclass(frozen=True, slots=True)
class PlatformConfig:
    """Webhooks y auth del agente en ElevenLabs."""

    webhook_url: str
    webhook_events: list[str]
    enable_auth: bool


@dataclass(frozen=True, slots=True)
class DeploymentConfig:
    """Estrategia de despliegue."""

    branch: str
    traffic_percentage: float
    environment: str


@dataclass(frozen=True, slots=True)
class AgentManifest:
    """Manifest declarativo completo."""

    agent: AgentConfig
    platform: PlatformConfig
    deployment: DeploymentConfig

    def __post_init__(self) -> None:
        if self.agent.language != "es":
            raise ValueError("language debe ser es")
        if not self.agent.tools:
            raise ValueError("tools no puede estar vacío")
        if not 0.0 <= self.deployment.traffic_percentage <= 1.0:
            raise ValueError("traffic_percentage debe estar entre 0 y 1")
