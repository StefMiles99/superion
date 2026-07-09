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
            "query_params_schema": spec.webhook.query_parameters,
            "request_headers": spec.webhook.headers,
        },
        "response_timeout_secs": spec.webhook.response_timeout_secs,
    }


def _literal_property(prop: dict[str, Any]):
    from elevenlabs.types.literal_json_schema_property import LiteralJsonSchemaProperty

    literal_kwargs: dict[str, Any] = {"type": prop["type"]}
    if prop.get("description"):
        literal_kwargs["description"] = prop["description"]
    if prop.get("dynamic_variable"):
        literal_kwargs["dynamic_variable"] = prop["dynamic_variable"]
    elif prop.get("constant_value") is not None:
        literal_kwargs["constant_value"] = prop["constant_value"]
    elif prop.get("is_omitted"):
        literal_kwargs["is_omitted"] = True
    return LiteralJsonSchemaProperty(**literal_kwargs)


def _to_object_json_schema(parameters: dict[str, Any]):
    from elevenlabs.types.object_json_schema_property_input import ObjectJsonSchemaPropertyInput

    properties = {
        name: _literal_property(prop)
        for name, prop in parameters.get("properties", {}).items()
    }
    return ObjectJsonSchemaPropertyInput(
        type="object",
        properties=properties,
        required=parameters.get("required") or [],
    )


def _to_query_params_schema(query_parameters: dict[str, object] | None):
    if not query_parameters:
        return None
    from elevenlabs.types.query_params_json_schema import QueryParamsJsonSchema

    props = query_parameters.get("properties", {})
    if not isinstance(props, dict):
        return None
    properties = {name: _literal_property(prop) for name, prop in props.items()}
    required = query_parameters.get("required")
    if not isinstance(required, list):
        required = list(properties.keys())
    return QueryParamsJsonSchema(properties=properties, required=required)


def build_tool_request_model(spec: AgentToolSpec) -> ToolRequestModel:
    """Construye ToolRequestModel compatible con elevenlabs SDK >= 2.x."""
    from elevenlabs.types import ToolRequestModel
    from elevenlabs.types.tool_request_model_tool_config import ToolRequestModelToolConfig_Webhook
    from elevenlabs.types.webhook_tool_api_schema_config_input import WebhookToolApiSchemaConfigInput

    body_schema = _to_object_json_schema(spec.parameters) if spec.parameters else None
    if spec.webhook.method == "POST" and body_schema is None:
        body_schema = _to_object_json_schema({"type": "object", "properties": {}})
    headers = spec.webhook.headers or None
    query_schema = _to_query_params_schema(spec.webhook.query_parameters)
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
                request_headers=headers,
                query_params_schema=query_schema,
            ),
        )
    )
