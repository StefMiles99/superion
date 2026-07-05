"""Tests de entidad MaintenanceReport — BE-07."""

from datetime import UTC, datetime

import pytest

from domain.entities.maintenance_report import MaintenanceReport
from domain.exceptions import ConflictError
from domain.value_objects.report_status import ReportStatus


def _report(*, version: int = 1, status: ReportStatus = ReportStatus.DRAFT) -> MaintenanceReport:
    return MaintenanceReport(
        id="rep-1",
        session_id="sess-1",
        status=status,
        content_json={"summary": "v1"},
        version=version,
        updated_at=datetime(2026, 7, 4, 14, 0, tzinfo=UTC),
    )


def test_report_rejects_version_below_one() -> None:
    with pytest.raises(ValueError, match="version"):
        MaintenanceReport(
            id="rep-1",
            session_id="sess-1",
            status=ReportStatus.DRAFT,
            content_json={},
            version=0,
            updated_at=datetime(2026, 7, 4, 14, 0, tzinfo=UTC),
        )


def test_with_content_increments_version_monotonically() -> None:
    report = _report(version=3)
    updated = report.with_content(
        content_json={"summary": "v2"},
        updated_at=datetime(2026, 7, 4, 15, 0, tzinfo=UTC),
    )
    assert updated.version == 4
    assert updated.content_json == {"summary": "v2"}


def test_mark_finalized_transitions_draft_to_finalized() -> None:
    report = _report()
    ended = datetime(2026, 7, 4, 16, 0, tzinfo=UTC)
    finalized = report.mark_finalized(
        pdf_storage_path="reports/sess-1/report.pdf",
        sha256="abc123",
        generated_at=ended,
        finalized_at=ended,
        content_json={"summary": "final"},
        updated_at=ended,
    )
    assert finalized.status == ReportStatus.FINALIZED
    assert finalized.pdf_storage_path == "reports/sess-1/report.pdf"
    assert finalized.sha256 == "abc123"
    assert finalized.version == 2


def test_mark_finalized_raises_when_already_finalized() -> None:
    report = _report(status=ReportStatus.FINALIZED)
    ended = datetime(2026, 7, 4, 16, 0, tzinfo=UTC)
    with pytest.raises(ConflictError, match="finalizado"):
        report.mark_finalized(
            pdf_storage_path="reports/sess-1/report.pdf",
            sha256="abc123",
            generated_at=ended,
            finalized_at=ended,
            content_json={"summary": "final"},
            updated_at=ended,
        )
