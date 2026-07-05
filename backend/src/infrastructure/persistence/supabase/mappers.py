"""Mapeo entidades ↔ filas Postgres — Supabase."""

from __future__ import annotations

import json
from datetime import UTC, datetime
from typing import Any

from domain.entities.asset import Asset
from domain.entities.audit_entry import AuditEntry
from domain.entities.evidence_photo import EvidencePhoto
from domain.entities.maintenance_report import MaintenanceReport
from domain.entities.maintenance_session import MaintenanceSession
from domain.entities.manual import Manual
from domain.entities.manual_chunk import ManualChunk
from domain.entities.procedure_template import ProcedureTemplate
from domain.entities.session_event import SessionEvent
from domain.entities.user import User
from domain.entities.work_order import WorkOrder
from domain.value_objects.action import AuditAction
from domain.value_objects.manual_status import IndexStatus, ManualStatus
from domain.value_objects.photo_status import PhotoStatus
from domain.value_objects.report_status import ReportStatus
from domain.value_objects.role import Role
from domain.value_objects.status import SessionStatus, WorkOrderStatus
from domain.value_objects.step import Step


def ensure_utc(dt: datetime) -> datetime:
    if dt.tzinfo is None:
        return dt.replace(tzinfo=UTC)
    return dt


def json_payload(raw: object) -> dict[str, object]:
    if raw is None:
        return {}
    if isinstance(raw, dict):
        return dict(raw)
    if isinstance(raw, str):
        parsed = json.loads(raw)
        if isinstance(parsed, dict):
            return dict(parsed)
    return {}


def payload_from_row(raw: object) -> dict[str, object]:
    """Alias explícito para payloads JSONB en tests y repos."""
    return json_payload(raw)


def session_event_to_row(event: SessionEvent) -> tuple[object, ...]:
    """Tupla de columnas para INSERT en session_event."""
    return (
        event.id,
        event.session_id,
        event.seq,
        event.type,
        json.dumps(event.payload),
        event.step_index,
        ensure_utc(event.created_at),
    )


def user_from_row(row: Any) -> User:
    return User(
        id=str(row["id"]),
        email=str(row["email"]),
        password_hash=str(row["password_hash"]),
        full_name=str(row["full_name"]),
        role=Role(str(row["role"])),
        plant_id=str(row["plant_id"]),
        is_blocked=bool(row["is_blocked"]),
    )


def asset_from_row(row: Any) -> Asset:
    return Asset(
        id=str(row["id"]),
        plant_id=str(row["plant_id"]),
        tag=str(row["tag"]),
        name=str(row["name"]),
        model=str(row["model"]),
        manufacturer=str(row["manufacturer"] or ""),
        current_manual_id=str(row["current_manual_id"] or ""),
    )


def manual_from_row(row: Any) -> Manual:
    return Manual(
        id=str(row["id"]),
        title=str(row["title"]),
        asset_model=str(row["asset_model"]),
        version=int(row["version"]),
        status=ManualStatus(str(row["status"])),
        index_status=IndexStatus(str(row["index_status"])),
        storage_path=str(row["storage_path"]),
        chunk_count=int(row["chunk_count"]),
        uploaded_at=ensure_utc(row["uploaded_at"]),
        uploaded_by_id=str(row["uploaded_by_id"]),
        plant_id=str(row["plant_id"]),
    )


def chunk_from_row(row: Any) -> ManualChunk:
    embedding_raw = row["embedding"]
    if isinstance(embedding_raw, list):
        embedding = tuple(float(v) for v in embedding_raw)
    else:
        embedding = tuple(float(v) for v in json.loads(str(embedding_raw)))
    return ManualChunk(
        id=str(row["id"]),
        manual_id=str(row["manual_id"]),
        page=int(row["page"]),
        section_path=str(row["section_path"] or ""),
        content=str(row["content"]),
        embedding=embedding,
        token_count=int(row["token_count"]),
    )


def steps_from_json(raw: object) -> tuple[Step, ...]:
    data = raw if isinstance(raw, list) else json.loads(str(raw))
    steps: list[Step] = []
    for item in data:
        if not isinstance(item, dict):
            continue
        steps.append(
            Step(
                index=int(item["index"]),
                title=str(item["title"]),
                description=str(item["description"]),
                estimated_minutes=int(item["estimated_minutes"]),
                critical=bool(item["critical"]),
                requires_photo=bool(item["requires_photo"]),
                photo_criteria=item.get("photo_criteria"),
            )
        )
    return tuple(steps)


def steps_to_json(steps: tuple[Step, ...]) -> str:
    payload = [
        {
            "index": step.index,
            "title": step.title,
            "description": step.description,
            "estimated_minutes": step.estimated_minutes,
            "critical": step.critical,
            "requires_photo": step.requires_photo,
            "photo_criteria": step.photo_criteria,
        }
        for step in steps
    ]
    return json.dumps(payload)


def procedure_template_from_row(row: Any) -> ProcedureTemplate:
    critical = row["critical_step_indices"] or []
    photo_required = row["photo_required_step_indices"] or []
    return ProcedureTemplate(
        id=str(row["id"]),
        name=str(row["name"]),
        version=str(row["version"]),
        manual_id=str(row["manual_id"]),
        steps=steps_from_json(row["steps"]),
        critical_step_indices=tuple(int(v) for v in critical),
        photo_required_step_indices=tuple(int(v) for v in photo_required),
        estimated_minutes=int(row["estimated_minutes"]),
    )


def work_order_from_row(row: Any) -> WorkOrder:
    linked = row["linked_wo_ids"] or []
    return WorkOrder(
        id=str(row["id"]),
        code=str(row["code"]),
        asset_id=str(row["asset_id"]),
        type=str(row["type"]),
        priority=str(row["priority"]),
        status=WorkOrderStatus(str(row["status"])),
        assigned_to=str(row["assigned_to"]) if row["assigned_to"] else None,
        planned_start=ensure_utc(row["planned_start"]),
        planned_end=ensure_utc(row["planned_end"]),
        procedure_template_id=str(row["procedure_template_id"]),
        created_at=ensure_utc(row["created_at"]),
        description=str(row["description"] or ""),
        notes=str(row["notes"] or ""),
        linked_wo_ids=tuple(str(v) for v in linked),
    )


def session_from_row(row: Any) -> MaintenanceSession:
    return MaintenanceSession(
        id=str(row["id"]),
        work_order_id=str(row["work_order_id"]),
        technician_id=str(row["technician_id"]),
        status=SessionStatus(str(row["status"])),
        started_at=ensure_utc(row["started_at"]),
        current_step_index=int(row["current_step_index"]),
        langgraph_thread_id=str(row["langgraph_thread_id"]),
        ended_at=ensure_utc(row["ended_at"]) if row["ended_at"] else None,
    )


def session_event_from_row(row: Any) -> SessionEvent:
    return SessionEvent(
        id=str(row["id"]),
        session_id=str(row["session_id"]),
        seq=int(row["seq"]),
        type=str(row["type"]),
        payload=json_payload(row["payload"]),
        step_index=int(row["step_index"]),
        created_at=ensure_utc(row["created_at"]),
    )


def photo_from_row(row: Any) -> EvidencePhoto:
    return EvidencePhoto(
        id=str(row["id"]),
        session_id=str(row["session_id"]),
        step_index=int(row["step_index"]),
        storage_path=str(row["storage_path"]),
        captured_at=ensure_utc(row["captured_at"]),
        validation_status=PhotoStatus(str(row["validation_status"])),
        validation_feedback=row["validation_feedback"],
        retries=int(row["retries"]),
        model_version=row["model_version"],
        event_id=row["event_id"],
        criteria=row["criteria"],
    )


def report_from_row(row: Any) -> MaintenanceReport:
    return MaintenanceReport(
        id=str(row["id"]),
        session_id=str(row["session_id"]),
        status=ReportStatus(str(row["status"])),
        content_json=json_payload(row["content_json"]),
        version=int(row["version"]),
        updated_at=ensure_utc(row["updated_at"]),
        pdf_storage_path=row["pdf_storage_path"],
        sha256=row["sha256"],
        generated_at=ensure_utc(row["generated_at"]) if row["generated_at"] else None,
        finalized_at=ensure_utc(row["finalized_at"]) if row["finalized_at"] else None,
    )


def audit_from_row(row: Any) -> AuditEntry:
    return AuditEntry(
        id=str(row["id"]),
        actor_user_id=str(row["actor_user_id"]),
        action=AuditAction(str(row["action"])),
        target_type=str(row["target_type"]),
        target_id=str(row["target_id"]),
        payload=json_payload(row["payload"]),
        created_at=ensure_utc(row["created_at"]),
    )
