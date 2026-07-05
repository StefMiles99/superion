"""Tests integration CLI ElevenLabs — BE-09."""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from interface.cli import elevenlabs as cli


@pytest.fixture
def manifest_env(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> Path:
    repo_root = Path(__file__).resolve().parents[3]
    state_file = tmp_path / "state.json"
    monkeypatch.setenv("ELEVENLABS_VOICE_ID", "voice-test")
    monkeypatch.setenv("API_BASE_URL", "http://localhost:8000")
    monkeypatch.setenv("DEPLOY_ENV", "dev")
    monkeypatch.setenv("ELEVENLABS_AGENT_MANIFEST", str(repo_root / "elevenlabs" / "agent.yaml"))
    monkeypatch.setenv("ELEVENLABS_STATE_FILE", str(state_file))
    monkeypatch.setenv("ELEVENLABS_PROVISIONER", "memory")
    return state_file


def test_cli_provision_dry_run(manifest_env: Path, capsys: pytest.CaptureFixture[str]) -> None:
    code = cli.main(["provision", "--dry-run"])
    assert code == 0
    out = capsys.readouterr().out
    payload = json.loads(out)
    assert payload["status"] == "draft"


def test_cli_provision_and_deploy(manifest_env: Path, capsys: pytest.CaptureFixture[str]) -> None:
    assert cli.main(["provision"]) == 0
    capsys.readouterr()
    assert cli.main(["deploy"]) == 0
    capsys.readouterr()
    assert cli.main(["status", "--json"]) == 0
    out = capsys.readouterr().out
    payload = json.loads(out)
    assert payload["status"] == "deployed"
    assert manifest_env.exists()
