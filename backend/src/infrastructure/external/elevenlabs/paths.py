"""Utilidades de rutas ElevenLabs — BE-09."""

from __future__ import annotations

from pathlib import Path


def resolve_repo_relative_path(raw_path: str) -> Path:
    """Resuelve path relativo al cwd o al padre (monorepo)."""
    candidate = Path(raw_path)
    if candidate.is_absolute():
        return candidate
    cwd_path = Path.cwd() / candidate
    if cwd_path.exists():
        return cwd_path
    parent_path = Path.cwd().parent / candidate
    if parent_path.exists():
        return parent_path
    if (
        len(candidate.parts) >= 1
        and candidate.parts[0] == "elevenlabs"
        and (Path.cwd().parent / "elevenlabs").is_dir()
    ):
        return parent_path
    return cwd_path
