"""Tests ToolBuilder — BE-09."""

from domain.entities.agent_tool_spec import AgentToolSpec, WebhookConfig
from infrastructure.external.elevenlabs.tool_builder import build_webhook_tool_payload


def _spec() -> AgentToolSpec:
    return AgentToolSpec(
        name="query_manual",
        description="Consulta manual técnico",
        parameters={
            "type": "object",
            "properties": {
                "question": {"type": "string"},
                "asset_id": {"type": "string"},
            },
            "required": ["question", "asset_id"],
        },
        webhook=WebhookConfig(
            method="POST",
            url_template="http://localhost:8000/v1/elevenlabs/tools/query_manual",
            headers={},
            response_timeout_secs=25,
        ),
    )


def test_build_webhook_tool_payload_shape() -> None:
    payload = build_webhook_tool_payload(_spec())

    assert payload["type"] == "webhook"
    assert payload["name"] == "query_manual"
    assert payload["description"] == "Consulta manual técnico"
    assert payload["api_schema"]["method"] == "POST"
    assert payload["api_schema"]["url"] == "http://localhost:8000/v1/elevenlabs/tools/query_manual"
    assert payload["response_timeout_secs"] == 25
