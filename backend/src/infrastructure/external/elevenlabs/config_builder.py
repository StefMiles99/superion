"""Builder de conversation_config y platform_settings — BE-09."""

from __future__ import annotations

from domain.entities.agent_manifest import AgentManifest


def build_conversation_config(
    manifest: AgentManifest,
    *,
    tool_ids: dict[str, str],
) -> dict[str, object]:
    """Construye conversation_config para agents.create/update."""
    return {
        "agent": {
            "first_message": manifest.agent.first_message,
            "language": manifest.agent.language,
            "prompt": {
                "prompt": manifest.agent.system_prompt,
                "llm": manifest.agent.llm,
                "tool_ids": list(tool_ids.values()),
            },
            "dynamic_variables": {
                "dynamic_variable_placeholders": manifest.agent.variables,
            },
        },
        "tts": {
            "voice_id": manifest.agent.voice_id,
            "model_id": manifest.agent.tts_model,
        },
        "asr": {
            "provider": "scribe_v2",
            "language": manifest.agent.language,
        },
        "turn": {
            "turn_detection": {"type": "server_vad"},
        },
    }


def build_platform_settings(manifest: AgentManifest) -> dict[str, object]:
    """Construye platform_settings con webhooks hacia FastAPI."""
    return {
        "auth": {"enable_auth": manifest.platform.enable_auth},
        "webhooks": {
            "conversation": {
                "url": manifest.platform.webhook_url,
                "events": manifest.platform.webhook_events,
            },
        },
    }
