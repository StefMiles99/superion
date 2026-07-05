"""CLI Python para provisionar agente ElevenLabs — BE-09."""

from __future__ import annotations

import argparse
import asyncio
import json
import os
import sys

from application.use_cases.elevenlabs.deploy_agent import DeployAgentUseCase
from application.use_cases.elevenlabs.load_manifest import LoadManifestUseCase
from application.use_cases.elevenlabs.provision_agent import ProvisionAgentUseCase
from domain.services.manifest_validator import ManifestValidator
from infrastructure.config import Settings
from infrastructure.external.elevenlabs.manifest_loader import YamlManifestLoader
from infrastructure.external.elevenlabs.paths import resolve_repo_relative_path
from infrastructure.external.elevenlabs.state_store import JsonStateStore
from infrastructure.factories import get_elevenlabs_provisioner, get_settings, set_settings


def _sync_manifest_env(settings: Settings) -> None:
    """Expone variables de settings a os.environ para sustitución en agent.yaml."""
    os.environ["ELEVENLABS_VOICE_ID"] = settings.ELEVENLABS_VOICE_ID
    os.environ["API_BASE_URL"] = settings.API_BASE_URL
    os.environ["DEPLOY_ENV"] = settings.DEPLOY_ENV


def _build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="SUPERION — ElevenLabs agent provisioner")
    sub = parser.add_subparsers(dest="command", required=True)

    provision = sub.add_parser("provision", help="Sincroniza tools y agente")
    provision.add_argument("--dry-run", action="store_true")
    provision.add_argument("--manifest", default=None)

    deploy = sub.add_parser("deploy", help="Publica agente provisionado")
    deploy.add_argument("--branch", default="main")
    deploy.add_argument("--traffic", type=float, default=1.0)

    status = sub.add_parser("status", help="Muestra estado local")
    status.add_argument("--json", action="store_true")

    validate = sub.add_parser("validate-manifest", help="Valida manifest sin provisionar")
    validate.add_argument("--manifest", default=None)

    return parser


async def _cmd_provision(args: argparse.Namespace) -> int:
    settings = get_settings()
    _sync_manifest_env(settings)
    manifest_path = resolve_repo_relative_path(args.manifest or settings.ELEVENLABS_AGENT_MANIFEST)
    state_path = resolve_repo_relative_path(settings.ELEVENLABS_STATE_FILE)
    loader = LoadManifestUseCase(
        loader=YamlManifestLoader(),
        validator=ManifestValidator(),
    )
    manifest = loader.execute(manifest_path=manifest_path, api_base_url=settings.API_BASE_URL)
    use_case = ProvisionAgentUseCase(
        provisioner=get_elevenlabs_provisioner(),
        state_store=JsonStateStore(state_path),
        api_base_url=settings.API_BASE_URL,
    )
    state = await use_case.execute(manifest=manifest, dry_run=args.dry_run)
    print(json.dumps({"agent_id": state.agent_id, "status": state.status.value}, indent=2))
    return 0


async def _cmd_deploy(args: argparse.Namespace) -> int:
    settings = get_settings()
    _sync_manifest_env(settings)
    state_path = resolve_repo_relative_path(settings.ELEVENLABS_STATE_FILE)
    use_case = DeployAgentUseCase(
        provisioner=get_elevenlabs_provisioner(),
        state_store=JsonStateStore(state_path),
    )
    state = await use_case.execute(branch=args.branch, traffic_percentage=args.traffic)
    print(json.dumps({"agent_id": state.agent_id, "status": state.status.value}, indent=2))
    return 0


def _cmd_status(args: argparse.Namespace) -> int:
    settings = get_settings()
    state_path = resolve_repo_relative_path(settings.ELEVENLABS_STATE_FILE)
    store = JsonStateStore(state_path)
    state = store.load()
    if state is None:
        print(json.dumps({"status": "not_provisioned"}))
        return 3
    payload = {
        "agent_id": state.agent_id,
        "branch_id": state.branch_id,
        "status": state.status.value,
        "environment": state.environment,
        "tools_synced": len(state.tool_ids),
        "deployed_at": state.deployed_at.isoformat() if state.deployed_at else None,
    }
    if args.json:
        print(json.dumps(payload, indent=2))
    else:
        print(f"agent_id={state.agent_id} status={state.status.value}")
    return 0


def _cmd_validate_manifest(args: argparse.Namespace) -> int:
    settings = get_settings()
    _sync_manifest_env(settings)
    manifest_path = resolve_repo_relative_path(args.manifest or settings.ELEVENLABS_AGENT_MANIFEST)
    loader = LoadManifestUseCase(
        loader=YamlManifestLoader(),
        validator=ManifestValidator(),
    )
    manifest = loader.execute(manifest_path=manifest_path, api_base_url=settings.API_BASE_URL)
    print(json.dumps({"ok": True, "agent_name": manifest.agent.name}))
    return 0


def main(argv: list[str] | None = None) -> int:
    parser = _build_parser()
    args = parser.parse_args(argv)
    set_settings(Settings())
    _sync_manifest_env(get_settings())
    try:
        if args.command == "provision":
            return asyncio.run(_cmd_provision(args))
        if args.command == "deploy":
            return asyncio.run(_cmd_deploy(args))
        if args.command == "status":
            return _cmd_status(args)
        if args.command == "validate-manifest":
            return _cmd_validate_manifest(args)
    except Exception as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
