"""Value object Citation — BE-05."""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True, slots=True)
class Citation:
    """Cita a un fragmento del manual — contrato §12.4 / query_manual."""

    manual_id: str
    manual_version: int
    page: int
    section_path: str
    chunk_id: str
    snippet: str

    def __post_init__(self) -> None:
        if self.manual_version < 1:
            raise ValueError("manual_version debe ser >= 1")
        if self.page < 1:
            raise ValueError("page debe ser >= 1")
        if not self.snippet:
            raise ValueError("snippet no puede estar vacío")
