"""Especificación de tool del agente ElevenLabs — BE-09."""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True, slots=True)
class WebhookConfig:
    """Configuración HTTP del webhook tool."""

    method: str
    url_template: str
    headers: dict[str, str]
    response_timeout_secs: int

    def __post_init__(self) -> None:
        if self.method not in {"GET", "POST", "PUT", "PATCH", "DELETE"}:
            raise ValueError("method HTTP inválido")
        if self.response_timeout_secs < 5 or self.response_timeout_secs > 120:
            raise ValueError("response_timeout_secs debe estar entre 5 y 120")


@dataclass(frozen=True, slots=True)
class AgentToolSpec:
    """Tool declarativa mapeada a webhook FastAPI."""

    name: str
    description: str
    parameters: dict[str, object]
    webhook: WebhookConfig

    def __post_init__(self) -> None:
        if not self.name.strip():
            raise ValueError("name no puede estar vacío")
        if not self.description.strip():
            raise ValueError("description no puede estar vacío")
