"""Builder de webhook tools ElevenLabs — BE-09."""

from __future__ import annotations

from domain.entities.agent_tool_spec import AgentToolSpec


def build_webhook_tool_payload(spec: AgentToolSpec) -> dict[str, object]:
    """Traduce AgentToolSpec al payload de tools.create de ElevenLabs."""
    return {
        "type": "webhook",
        "name": spec.name,
        "description": spec.description,
        "api_schema": {
            "url": spec.webhook.url_template,
            "method": spec.webhook.method,
            "request_body_schema": spec.parameters,
        },
        "response_timeout_secs": spec.webhook.response_timeout_secs,
    }
