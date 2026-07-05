"""Tests LoadManifestUseCase — BE-09."""

from pathlib import Path

import pytest

from application.use_cases.elevenlabs.load_manifest import LoadManifestUseCase
from domain.exceptions import ValidationError
from domain.services.manifest_validator import ManifestValidator
from infrastructure.external.elevenlabs.manifest_loader import YamlManifestLoader

REPO_ROOT = Path(__file__).resolve().parents[4]
MANIFEST_PATH = REPO_ROOT / "elevenlabs" / "agent.yaml"


@pytest.fixture
def use_case() -> LoadManifestUseCase:
    return LoadManifestUseCase(
        loader=YamlManifestLoader(),
        validator=ManifestValidator(),
    )


def test_load_manifest_resolves_include_and_env(
    monkeypatch: pytest.MonkeyPatch,
    use_case: LoadManifestUseCase,
) -> None:
    monkeypatch.setenv("ELEVENLABS_VOICE_ID", "voice-test")
    monkeypatch.setenv("API_BASE_URL", "http://localhost:8000")
    monkeypatch.setenv("DEPLOY_ENV", "dev")

    manifest = use_case.execute(
        manifest_path=MANIFEST_PATH,
        api_base_url="http://localhost:8000",
    )

    assert manifest.agent.name == "superion-technician"
    assert manifest.agent.voice_id == "voice-test"
    assert manifest.agent.language == "es"
    assert len(manifest.agent.tools) >= 1
    assert "copiloto" in manifest.agent.system_prompt.lower()
    assert manifest.platform.webhook_url.endswith("/v1/elevenlabs/webhooks/conversation")
    assert manifest.deployment.environment == "dev"


def test_load_manifest_fails_on_missing_env(
    monkeypatch: pytest.MonkeyPatch,
    use_case: LoadManifestUseCase,
) -> None:
    monkeypatch.delenv("ELEVENLABS_VOICE_ID", raising=False)
    with pytest.raises(ValidationError, match="ELEVENLABS_VOICE_ID"):
        use_case.execute(
            manifest_path=MANIFEST_PATH,
            api_base_url="http://localhost:8000",
        )
