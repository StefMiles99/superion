"""Builder de webhook tools ElevenLabs — BE-09."""

from __future__ import annotations

from typing import TYPE_CHECKING, Any

from domain.entities.agent_tool_spec import AgentToolSpec

if TYPE_CHECKING:
    from elevenlabs.types import ToolRequestModel


def build_webhook_tool_payload(spec: AgentToolSpec) -> dict[str, object]:
    """Traduce AgentToolSpec al payload legado (tests y documentación)."""
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


def _to_object_json_schema(parameters: dict[str, Any]):
    from elevenlabs.types.literal_json_schema_property import LiteralJsonSchemaProperty
    from elevenlabs.types.object_json_schema_property_input import ObjectJsonSchemaPropertyInput

    properties: dict[str, LiteralJsonSchemaProperty] = {}
    for name, prop in parameters.get("properties", {}).items():
        properties[name] = LiteralJsonSchemaProperty(
            type=prop["type"],
            description=prop.get("description"),
        )
    return ObjectJsonSchemaPropertyInput(
        type="object",
        properties=properties,
        required=parameters.get("required") or [],
    )


def build_tool_request_model(spec: AgentToolSpec) -> ToolRequestModel:
    """Construye ToolRequestModel compatible con elevenlabs SDK >= 2.x."""
    from elevenlabs.types import ToolRequestModel
    from elevenlabs.types.tool_request_model_tool_config import ToolRequestModelToolConfig_Webhook
    from elevenlabs.types.webhook_tool_api_schema_config_input import WebhookToolApiSchemaConfigInput

    body_schema = _to_object_json_schema(spec.parameters) if spec.parameters else None
    return ToolRequestModel(
        tool_config=ToolRequestModelToolConfig_Webhook(
            type="webhook",
            name=spec.name,
            description=spec.description,
            response_timeout_secs=spec.webhook.response_timeout_secs,
            api_schema=WebhookToolApiSchemaConfigInput(
                url=spec.webhook.url_template,
                method=spec.webhook.method,
                request_body_schema=body_schema,
            ),
        )
    )
