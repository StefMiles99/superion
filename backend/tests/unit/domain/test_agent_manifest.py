"""Tests AgentManifest entity — BE-09."""

import pytest

from domain.entities.agent_manifest import AgentConfig, AgentManifest, DeploymentConfig, PlatformConfig
from domain.entities.agent_tool_spec import AgentToolSpec, WebhookConfig


def _tool(name: str = "query_manual") -> AgentToolSpec:
    return AgentToolSpec(
        name=name,
        description="Consulta manual",
        parameters={"type": "object", "properties": {"question": {"type": "string"}}},
        webhook=WebhookConfig(
            method="POST",
            url_template="http://localhost:8000/v1/elevenlabs/tools/query_manual",
            headers={},
            response_timeout_secs=25,
        ),
    )


def _manifest(*, language: str = "es", tools: list[AgentToolSpec] | None = None) -> AgentManifest:
    return AgentManifest(
        agent=AgentConfig(
            name="superion-technician",
            tags=["superion"],
            voice_id="voice-1",
            tts_model="eleven_multilingual_v2",
            language=language,
            first_message="Hola",
            llm="gemini-2.0-flash",
            system_prompt="Eres copiloto de mantenimiento.",
            tools=tools or [_tool()],
            variables={"locale": "es-MX"},
        ),
        platform=PlatformConfig(
            webhook_url="http://localhost:8000/v1/elevenlabs/webhooks/conversation",
            webhook_events=["conversation.started", "utterance.final"],
            enable_auth=True,
        ),
        deployment=DeploymentConfig(
            branch="main",
            traffic_percentage=1.0,
            environment="dev",
        ),
    )


def test_manifest_requires_spanish_language() -> None:
    with pytest.raises(ValueError, match="language"):
        _manifest(language="en")


def test_manifest_requires_at_least_one_tool() -> None:
    base = _manifest()
    with pytest.raises(ValueError, match="tools"):
        AgentManifest(
            agent=AgentConfig(
                name=base.agent.name,
                tags=base.agent.tags,
                voice_id=base.agent.voice_id,
                tts_model=base.agent.tts_model,
                language="es",
                first_message=base.agent.first_message,
                llm=base.agent.llm,
                system_prompt=base.agent.system_prompt,
                tools=[],
                variables=base.agent.variables,
            ),
            platform=base.platform,
            deployment=base.deployment,
        )


def test_manifest_traffic_must_be_between_0_and_1() -> None:
    manifest = _manifest()
    with pytest.raises(ValueError, match="traffic_percentage"):
        AgentManifest(
            agent=manifest.agent,
            platform=manifest.platform,
            deployment=DeploymentConfig(
                branch="main",
                traffic_percentage=1.5,
                environment="dev",
            ),
        )
