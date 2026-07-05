"""Carga YAML declarativo del agente — BE-09."""

from __future__ import annotations

import json
import os
import re
from pathlib import Path
from typing import Any

import yaml

from domain.entities.agent_manifest import (
    AgentConfig,
    AgentManifest,
    DeploymentConfig,
    PlatformConfig,
)
from domain.entities.agent_tool_spec import AgentToolSpec, WebhookConfig
from domain.exceptions import ValidationError

_ENV_PATTERN = re.compile(r"\$\{([A-Z0-9_]+)\}")


def _build_loader(base_dir: Path) -> type[yaml.SafeLoader]:
    class ManifestLoader(yaml.SafeLoader):
        pass

    def include_constructor(loader: yaml.SafeLoader, node: yaml.Node) -> Any:
        del loader
        relative = str(node.value)
        include_path = (base_dir / relative).resolve()
        with include_path.open(encoding="utf-8") as handle:
            if include_path.suffix == ".json":
                return json.load(handle)
            if include_path.suffix in {".md", ".txt"}:
                return handle.read()
            return yaml.load(handle, Loader=ManifestLoader)

    ManifestLoader.add_constructor("!include", include_constructor)
    return ManifestLoader


def _substitute_env(value: str) -> str:
    def replacer(match: re.Match[str]) -> str:
        var_name = match.group(1)
        env_value = os.environ.get(var_name)
        if env_value is None or env_value == "":
            raise ValidationError(
                code="VALIDATION_ERROR",
                message=f"variable de entorno requerida no definida: {var_name}",
                details={"env_var": var_name},
            )
        return env_value

    return _ENV_PATTERN.sub(replacer, value)


def _substitute_tree(node: Any) -> Any:
    if isinstance(node, str):
        return _substitute_env(node) if "${" in node else node
    if isinstance(node, list):
        return [_substitute_tree(item) for item in node]
    if isinstance(node, dict):
        return {key: _substitute_tree(value) for key, value in node.items()}
    return node


def _parse_tools(raw_tools: list[dict[str, Any]], *, api_base_url: str) -> list[AgentToolSpec]:
    tools: list[AgentToolSpec] = []
    for raw in raw_tools:
        webhook_raw = raw["webhook"]
        url_template = webhook_raw["url_template"]
        if "${API_BASE_URL}" in url_template:
            url_template = url_template.replace("${API_BASE_URL}", api_base_url.rstrip("/"))
        tools.append(
            AgentToolSpec(
                name=raw["name"],
                description=raw["description"],
                parameters=raw["parameters"],
                webhook=WebhookConfig(
                    method=webhook_raw["method"],
                    url_template=url_template,
                    headers=webhook_raw.get("headers", {}),
                    response_timeout_secs=int(webhook_raw.get("response_timeout_secs", 20)),
                ),
            )
        )
    return tools


class YamlManifestLoader:
    """Lee agent.yaml y construye AgentManifest."""

    def load(self, manifest_path: Path, *, api_base_url: str) -> AgentManifest:
        base_dir = manifest_path.parent.resolve()
        loader_cls = _build_loader(base_dir)
        with manifest_path.open(encoding="utf-8") as handle:
            raw = yaml.load(handle, Loader=loader_cls)

        if not isinstance(raw, dict):
            raise ValidationError(
                code="VALIDATION_ERROR",
                message="manifest inválido",
            )

        data = _substitute_tree(raw)
        agent_raw = data["agent"]
        platform_raw = data["platform"]
        deployment_raw = data["deployment"]
        webhook = platform_raw["webhooks"]["conversation"]

        return AgentManifest(
            agent=AgentConfig(
                name=agent_raw["name"],
                tags=list(agent_raw.get("tags", [])),
                voice_id=agent_raw["voice_id"],
                tts_model=agent_raw["tts_model"],
                language=agent_raw["language"],
                first_message=agent_raw["first_message"],
                llm=agent_raw["llm"],
                system_prompt=str(agent_raw["system_prompt"]).strip(),
                tools=_parse_tools(list(agent_raw["tools"]), api_base_url=api_base_url),
                variables={str(k): str(v) for k, v in agent_raw.get("variables", {}).items()},
            ),
            platform=PlatformConfig(
                webhook_url=webhook["url"],
                webhook_events=list(webhook.get("events", [])),
                enable_auth=bool(platform_raw.get("auth", {}).get("enable_auth", True)),
            ),
            deployment=DeploymentConfig(
                branch=deployment_raw["branch"],
                traffic_percentage=float(deployment_raw["traffic_percentage"]),
                environment=deployment_raw["environment"],
            ),
        )
