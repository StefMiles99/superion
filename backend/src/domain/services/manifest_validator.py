"""Validador puro de AgentManifest — BE-09."""

from __future__ import annotations

from domain.entities.agent_manifest import AgentManifest
from domain.exceptions import ValidationError

ALLOWED_TOOL_NAMES = frozenset({
    "get_current_step",
    "get_session_summary",
    "query_manual",
    "request_evidence_photo",
    "mark_step_complete",
    "skip_step",
    "add_finding",
    "add_measurement",
    "pause_session",
    "resume_session",
    "finalize_session",
})


class ManifestValidator:
    """Valida invariantes del manifest contra contrato §4.2."""

    def validate(self, manifest: AgentManifest, *, api_base_url: str) -> None:
        base = api_base_url.rstrip("/")
        for tool in manifest.agent.tools:
            if tool.name not in ALLOWED_TOOL_NAMES:
                raise ValidationError(
                    code="VALIDATION_ERROR",
                    message=f"tool desconocida: {tool.name}",
                    details={"tool_name": tool.name},
                )
            if not tool.webhook.url_template.startswith(base):
                raise ValidationError(
                    code="VALIDATION_ERROR",
                    message="webhook url debe usar API_BASE_URL configurada",
                    details={
                        "tool_name": tool.name,
                        "url_template": tool.webhook.url_template,
                        "api_base_url": base,
                    },
                )
        if not manifest.platform.webhook_url.startswith(base):
            raise ValidationError(
                code="VALIDATION_ERROR",
                message="webhook de conversación debe usar API_BASE_URL",
                details={"webhook_url": manifest.platform.webhook_url},
            )
