"""Tests de ReportBuilder — BE-07."""

from datetime import UTC, datetime

from application.use_cases.reports.builder import ReportBuilder, compute_report_diff
from domain.entities.asset import Asset
from domain.entities.evidence_photo import EvidencePhoto
from domain.entities.maintenance_session import MaintenanceSession
from domain.entities.procedure_template import ProcedureTemplate
from domain.entities.session_event import SessionEvent
from domain.entities.user import User
from domain.entities.work_order import WorkOrder
from domain.value_objects.photo_status import PhotoStatus
from domain.value_objects.role import Role
from domain.value_objects.status import SessionStatus, WorkOrderStatus
from domain.value_objects.step import Step


def _session() -> MaintenanceSession:
    return MaintenanceSession(
        id="sess-1",
        work_order_id="wo-1",
        technician_id="tech-1",
        status=SessionStatus.ACTIVE,
        started_at=datetime(2026, 7, 4, 14, 0, tzinfo=UTC),
        current_step_index=1,
        langgraph_thread_id="thread-1",
    )


def _work_order() -> WorkOrder:
    return WorkOrder(
        id="wo-1",
        code="OT-1001",
        asset_id="asset-1",
        type="preventive",
        priority="high",
        status=WorkOrderStatus.IN_PROGRESS,
        assigned_to="tech-1",
        planned_start=datetime(2026, 7, 4, 14, 0, tzinfo=UTC),
        planned_end=datetime(2026, 7, 4, 16, 0, tzinfo=UTC),
        procedure_template_id="tmpl-1",
        created_at=datetime(2026, 7, 1, 8, 0, tzinfo=UTC),
    )


def _template() -> ProcedureTemplate:
    return ProcedureTemplate(
        id="tmpl-1",
        name="Test",
        version="1",
        manual_id="manual-1",
        steps=(
            Step(
                index=0,
                title="Paso 1",
                description="Desc 1",
                estimated_minutes=5,
                critical=False,
                requires_photo=False,
                photo_criteria=None,
            ),
            Step(
                index=1,
                title="Paso 2",
                description="Desc 2",
                estimated_minutes=5,
                critical=False,
                requires_photo=True,
                photo_criteria="sensor visible",
            ),
        ),
        critical_step_indices=(),
        photo_required_step_indices=(1,),
        estimated_minutes=10,
    )


def _event(
    seq: int,
    event_type: str,
    payload: dict[str, object],
    step_index: int = 0,
) -> SessionEvent:
    return SessionEvent(
        id=f"evt-{seq}",
        session_id="sess-1",
        seq=seq,
        type=event_type,
        payload=payload,
        step_index=step_index,
        created_at=datetime(2026, 7, 4, 14, seq, tzinfo=UTC),
    )


def test_builder_converts_events_photos_findings_to_structured_json() -> None:
    events = [
        _event(1, "step.completed", {"index": 0, "duration_seconds": 60}),
        _event(2, "finding", {"text": "Fuga menor", "severity": "low"}, step_index=0),
        _event(3, "measurement", {"name": "presión", "value": 8.5, "unit": "bar"}, step_index=1),
        _event(
            4,
            "photo",
            {"status": "accepted", "photo_id": "ph-1", "feedback": "ok"},
            step_index=1,
        ),
    ]
    photos = [
        EvidencePhoto(
            id="ph-1",
            session_id="sess-1",
            step_index=1,
            storage_path="sess-1/ph-1.jpg",
            criteria="sensor visible",
            validation_status=PhotoStatus.ACCEPTED,
            validation_feedback="ok",
            captured_at=datetime(2026, 7, 4, 14, 30, tzinfo=UTC),
            event_id="evt-photo",
        ),
    ]

    content = ReportBuilder().build(
        session=_session(),
        work_order=_work_order(),
        asset=Asset(
            id="asset-1",
            plant_id="plant-1",
            tag="TAG-1",
            name="Compresor C-3",
            model="GA-37",
            manufacturer="Atlas",
            current_manual_id="manual-1",
        ),
        technician=User(
            id="tech-1",
            email="juan@planta.com",
            password_hash="hash",
            full_name="Juan Pérez",
            role=Role.TECHNICIAN,
            plant_id="plant-1",
        ),
        template=_template(),
        events=events,
        photos=photos,
    )

    assert content["header"]["ot_code"] == "OT-1001"
    assert content["header"]["technician"] == "Juan Pérez"
    assert "1/2 pasos completados" in str(content["summary"])
    assert len(content["findings"]) == 1
    assert len(content["measurements"]) == 1
    assert len(content["photos_gallery"]) == 1
    assert content["procedure"][0]["status"] == "done"
    assert content["procedure"][1]["photos"][0]["path"] == "sess-1/ph-1.jpg"


def test_compute_report_diff_detects_summary_and_fields() -> None:
    old = {
        "summary": "a",
        "findings": [],
        "measurements": [],
        "procedure": [],
        "photos_gallery": [],
    }
    new = {
        "summary": "b",
        "findings": [{"text": "x"}],
        "measurements": [],
        "procedure": [],
        "photos_gallery": [],
    }
    diff = compute_report_diff(
        old_content=old,
        new_content=new,
        added_event_seq=42,
        step_index=1,
    )
    assert diff.summary_changed is True
    assert diff.added_event_seq == 42
    assert diff.step_index == 1
    assert "findings" in diff.fields_changed
