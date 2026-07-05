"""Tests ConfigBuilder — BE-09."""

from domain.entities.agent_manifest import AgentConfig, AgentManifest, DeploymentConfig, PlatformConfig
from domain.entities.agent_tool_spec import AgentToolSpec, WebhookConfig
from infrastructure.external.elevenlabs.config_builder import (
    build_conversation_config,
    build_platform_settings,
)


def _manifest() -> AgentManifest:
    tool = AgentToolSpec(
        name="query_manual",
        description="Consulta manual",
        parameters={"type": "object", "properties": {}},
        webhook=WebhookConfig(
            method="POST",
            url_template="http://localhost:8000/v1/elevenlabs/tools/query_manual",
            headers={},
            response_timeout_secs=20,
        ),
    )
    return AgentManifest(
        agent=AgentConfig(
            name="superion-technician",
            tags=["superion"],
            voice_id="voice-1",
            tts_model="eleven_multilingual_v2",
            language="es",
            first_message="Hola técnico",
            llm="gemini-2.0-flash",
            system_prompt="Eres copiloto.",
            tools=[tool],
            variables={"plant_name": "Planta Norte"},
        ),
        platform=PlatformConfig(
            webhook_url="http://localhost:8000/v1/elevenlabs/webhooks/conversation",
            webhook_events=["conversation.started", "utterance.final"],
            enable_auth=True,
        ),
        deployment=DeploymentConfig(branch="main", traffic_percentage=1.0, environment="dev"),
    )


def test_build_conversation_config_includes_voice_and_prompt() -> None:
    config = build_conversation_config(_manifest(), tool_ids={"query_manual": "tool-abc"})

    assert config["agent"]["first_message"] == "Hola técnico"
    assert config["agent"]["language"] == "es"
    assert config["agent"]["prompt"]["prompt"] == "Eres copiloto."
    assert config["agent"]["prompt"]["llm"] == "gemini-2.0-flash"
    assert config["tts"]["voice_id"] == "voice-1"
    assert "tool-abc" in config["agent"]["prompt"]["tool_ids"]


def test_build_platform_settings_includes_webhook() -> None:
    settings = build_platform_settings(_manifest())

    assert settings["auth"]["enable_auth"] is True
    assert settings["webhooks"]["conversation"]["url"].endswith(
        "/v1/elevenlabs/webhooks/conversation"
    )
