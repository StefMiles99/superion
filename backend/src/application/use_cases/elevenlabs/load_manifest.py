"""Use case LoadManifest — BE-09."""

from __future__ import annotations

from pathlib import Path

from domain.entities.agent_manifest import AgentManifest
from domain.services.manifest_validator import ManifestValidator
from infrastructure.external.elevenlabs.manifest_loader import YamlManifestLoader


class LoadManifestUseCase:
    """Carga y valida manifest declarativo."""

    def __init__(
        self,
        *,
        loader: YamlManifestLoader,
        validator: ManifestValidator,
    ) -> None:
        self._loader = loader
        self._validator = validator

    def execute(self, *, manifest_path: Path, api_base_url: str) -> AgentManifest:
        manifest = self._loader.load(manifest_path, api_base_url=api_base_url)
        self._validator.validate(manifest, api_base_url=api_base_url)
        return manifest
