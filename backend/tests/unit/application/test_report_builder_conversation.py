"""Tests ReportBuilder con conversación — BE-07."""

from datetime import UTC, datetime

from application.use_cases.reports.builder import ReportBuilder
from domain.entities.asset import Asset
from domain.entities.maintenance_session import MaintenanceSession
from domain.entities.procedure_template import ProcedureTemplate
from domain.entities.session_event import SessionEvent
from domain.entities.user import User
from domain.entities.work_order import WorkOrder
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
        current_step_index=0,
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
                title="Aislar",
                description="Desc",
                estimated_minutes=5,
                critical=True,
                requires_photo=False,
                photo_criteria=None,
            ),
        ),
        critical_step_indices=(0,),
        photo_required_step_indices=(),
        estimated_minutes=5,
    )


def _event(event_type: str, payload: dict[str, object]) -> SessionEvent:
    return SessionEvent(
        id="evt-1",
        session_id="sess-1",
        seq=1,
        type=event_type,
        payload=payload,
        step_index=0,
        created_at=datetime(2026, 7, 4, 14, 5, tzinfo=UTC),
    )


def test_utterance_and_observation_in_step_observations() -> None:
    builder = ReportBuilder()
    events = [
        _event("utterance", {"text": "cerré la válvula", "speaker": "technician"}),
        _event("observation", {"text": "equipo aislado correctamente", "source": "voice"}),
    ]

    content = builder.build(
        session=_session(),
        work_order=_work_order(),
        asset=Asset(
            id="asset-1",
            plant_id="plant-1",
            tag="C-3",
            name="Compresor",
            model="GA-37",
            manufacturer="Atlas",
            current_manual_id="manual-1",
        ),
        technician=User(
            id="tech-1",
            email="j@x.com",
            password_hash="h",
            full_name="Juan",
            role=Role.TECHNICIAN,
            plant_id="plant-1",
            is_blocked=False,
        ),
        template=_template(),
        events=events,
        photos=[],
    )

    procedure = content["procedure"]
    assert isinstance(procedure, list)
    observations = procedure[0]["observations"]
    assert "cerré la válvula" in observations
    assert "equipo aislado correctamente" in observations
