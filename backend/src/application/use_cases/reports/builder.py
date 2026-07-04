"""Lógica pura de construcción de report JSON — BE-07."""

from __future__ import annotations

from datetime import datetime

from domain.entities.asset import Asset
from domain.entities.evidence_photo import EvidencePhoto
from domain.entities.maintenance_session import MaintenanceSession
from domain.entities.procedure_template import ProcedureTemplate
from domain.entities.session_event import SessionEvent
from domain.entities.user import User
from domain.entities.work_order import WorkOrder
from domain.value_objects.event_type import EventType
from domain.value_objects.photo_status import PhotoStatus
from domain.value_objects.report_diff import ReportDiff


def _iso(dt: datetime | None) -> str | None:
    if dt is None:
        return None
    return dt.isoformat().replace("+00:00", "Z")


def _duration_minutes(started_at: datetime, ended_at: datetime | None) -> int | None:
    if ended_at is None:
        return None
    delta = ended_at - started_at
    return max(0, int(delta.total_seconds() // 60))


class ReportBuilder:
    """Transforma eventos + contexto en JSON estructurado §2.5."""

    def build(
        self,
        *,
        session: MaintenanceSession,
        work_order: WorkOrder,
        asset: Asset,
        technician: User,
        template: ProcedureTemplate,
        events: list[SessionEvent],
        photos: list[EvidencePhoto],
    ) -> dict[str, object]:
        findings: list[dict[str, object]] = []
        measurements: list[dict[str, object]] = []
        completed_steps: set[int] = set()
        skipped_steps: dict[int, str] = {}
        step_observations: dict[int, list[str]] = {}
        step_findings: dict[int, list[dict[str, object]]] = {}

        for event in events:
            if event.type == EventType.STEP_COMPLETED.value:
                payload = event.payload
                idx = int(payload.get("index", event.step_index))
                completed_steps.add(idx)
            elif event.type == EventType.STEP_SKIPPED.value:
                payload = event.payload
                idx = int(payload.get("index", event.step_index))
                skipped_steps[idx] = str(payload.get("reason", ""))
            elif event.type == EventType.FINDING.value:
                text = str(event.payload.get("text", ""))
                severity = str(event.payload.get("severity", "low"))
                finding = {"text": text, "severity": severity, "step_index": event.step_index}
                findings.append(finding)
                step_findings.setdefault(event.step_index, []).append(
                    {"text": text, "severity": severity}
                )
            elif event.type == EventType.MEASUREMENT.value:
                measurements.append({
                    "name": str(event.payload.get("name", "")),
                    "value": event.payload.get("value"),
                    "unit": str(event.payload.get("unit", "")),
                    "step_index": event.step_index,
                })
            elif event.type == EventType.PHOTO.value:
                status = str(event.payload.get("status", ""))
                if status == "accepted":
                    feedback = str(event.payload.get("feedback", ""))
                    step_observations.setdefault(event.step_index, []).append(feedback)

        accepted_photos = [
            photo for photo in photos if photo.validation_status == PhotoStatus.ACCEPTED
        ]
        photos_by_step: dict[int, list[EvidencePhoto]] = {}
        for photo in accepted_photos:
            photos_by_step.setdefault(photo.step_index, []).append(photo)

        procedure: list[dict[str, object]] = []
        for step in template.steps:
            status = "pending"
            skip_reason: str | None = None
            if step.index in completed_steps:
                status = "done"
            elif step.index in skipped_steps:
                status = "skipped"
                skip_reason = skipped_steps[step.index]

            step_photos = photos_by_step.get(step.index, [])
            procedure.append({
                "index": step.index,
                "title": step.title,
                "started_at": None,
                "ended_at": None,
                "duration_min": None,
                "status": status,
                "skip_reason": skip_reason,
                "photos": [
                    {
                        "path": photo.storage_path,
                        "caption": photo.criteria or photo.validation_feedback or "",
                    }
                    for photo in step_photos
                ],
                "observations": step_observations.get(step.index, []),
                "findings": step_findings.get(step.index, []),
            })

        done_count = len(completed_steps)
        total = len(template.steps)
        summary = (
            f"Mantenimiento {work_order.code}: {done_count}/{total} pasos completados. "
            f"{len(findings)} hallazgos, {len(accepted_photos)} fotos aceptadas."
        )

        photos_gallery = [
            {
                "photo_id": photo.id,
                "step_index": photo.step_index,
                "path": photo.storage_path,
                "caption": photo.criteria or photo.validation_feedback or "",
            }
            for photo in accepted_photos
        ]

        return {
            "header": {
                "ot_code": work_order.code,
                "technician": technician.full_name,
                "asset": asset.name,
                "plant": asset.plant_id,
                "started_at": _iso(session.started_at),
                "ended_at": _iso(session.ended_at),
                "duration_min": _duration_minutes(session.started_at, session.ended_at),
            },
            "summary": summary,
            "procedure": procedure,
            "findings": findings,
            "measurements": measurements,
            "photos_gallery": photos_gallery,
            "next_actions": [],
        }


def compute_report_diff(
    *,
    old_content: dict[str, object],
    new_content: dict[str, object],
    added_event_seq: int,
    step_index: int | None = None,
) -> ReportDiff:
    """Calcula diff entre dos versiones del content_json."""
    summary_changed = old_content.get("summary") != new_content.get("summary")
    fields_changed: list[str] = []

    if old_content.get("findings") != new_content.get("findings"):
        fields_changed.append("findings")
    if old_content.get("measurements") != new_content.get("measurements"):
        fields_changed.append("measurements")
    if old_content.get("procedure") != new_content.get("procedure"):
        fields_changed.append("procedure")
    if old_content.get("photos_gallery") != new_content.get("photos_gallery"):
        fields_changed.append("photos_gallery")

    return ReportDiff(
        summary_changed=summary_changed,
        step_index=step_index,
        added_event_seq=added_event_seq,
        fields_changed=tuple(fields_changed),
    )
