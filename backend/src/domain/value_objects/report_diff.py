"""Value object ReportDiff — BE-07."""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True, slots=True)
class ReportDiff:
    """Diff incremental publicado por WS report.updated."""

    summary_changed: bool
    added_event_seq: int
    step_index: int | None = None
    fields_changed: tuple[str, ...] = ()
