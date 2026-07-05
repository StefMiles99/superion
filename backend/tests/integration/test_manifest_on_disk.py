"""Tests integration manifest on disk — BE-09."""

from pathlib import Path

import pytest

from application.use_cases.elevenlabs.load_manifest import LoadManifestUseCase
from domain.services.manifest_validator import ManifestValidator
from infrastructure.external.elevenlabs.manifest_loader import YamlManifestLoader

REPO_ROOT = Path(__file__).resolve().parents[3]
MANIFEST_PATH = REPO_ROOT / "elevenlabs" / "agent.yaml"


def test_manifest_on_disk_loads(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("ELEVENLABS_VOICE_ID", "voice-test")
    monkeypatch.setenv("API_BASE_URL", "http://localhost:8000")
    monkeypatch.setenv("DEPLOY_ENV", "dev")

    use_case = LoadManifestUseCase(
        loader=YamlManifestLoader(),
        validator=ManifestValidator(),
    )
    manifest = use_case.execute(
        manifest_path=MANIFEST_PATH,
        api_base_url="http://localhost:8000",
    )
    assert manifest.agent.name == "superion-technician"
    tool_names = {tool.name for tool in manifest.agent.tools}
    assert "query_manual" in tool_names
