"""Ports de repositorios — BE-01/BE-02."""

from __future__ import annotations

from typing import Protocol

from domain.entities.asset import Asset
from domain.entities.evidence_photo import EvidencePhoto
from domain.entities.maintenance_session import MaintenanceSession
from domain.entities.procedure_template import ProcedureTemplate
from domain.entities.session_event import SessionEvent
from domain.entities.user import User
from domain.entities.work_order import WorkOrder


class IUserRepository(Protocol):
    """Persistencia de usuarios."""

    async def get_by_id(self, user_id: str) -> User | None: ...

    async def get_by_email(self, email: str) -> User | None: ...


class ITokenBlacklist(Protocol):
    """Revocación de tokens por jti."""

    async def register_refresh(self, user_id: str, jti: str) -> None: ...

    async def revoke(self, jti: str) -> None: ...

    async def is_revoked(self, jti: str) -> bool: ...

    async def revoke_all_for_user(self, user_id: str) -> None: ...


class IWorkOrderRepository(Protocol):
    """Persistencia de órdenes de trabajo."""

    async def list_for_technician(
        self,
        *,
        technician_id: str,
        statuses: list[str] | None = None,
        priority: str | None = None,
        asset_id: str | None = None,
        cursor: str | None = None,
        limit: int = 20,
    ) -> tuple[list[WorkOrder], str | None]: ...

    async def get_by_id_for_technician(
        self,
        work_order_id: str,
        *,
        technician_id: str,
    ) -> WorkOrder | None: ...

    async def save(self, work_order: WorkOrder) -> None: ...


class IProcedureTemplateRepository(Protocol):
    """Persistencia de plantillas de procedimiento."""

    async def get_by_id(self, template_id: str) -> ProcedureTemplate | None: ...


class IAssetRepository(Protocol):
    """Persistencia de activos."""

    async def get_by_id(self, asset_id: str) -> Asset | None: ...


class ISessionRepository(Protocol):
    """Persistencia de sesiones de mantenimiento."""

    async def save(self, session: MaintenanceSession) -> None: ...

    async def get_by_id_for_technician(
        self,
        session_id: str,
        *,
        technician_id: str,
    ) -> MaintenanceSession | None: ...

    async def get_active_for_work_order(
        self,
        work_order_id: str,
    ) -> MaintenanceSession | None: ...


class ISessionEventRepository(Protocol):
    """Persistencia append-only de eventos de sesión."""

    async def append(self, event: SessionEvent) -> SessionEvent: ...

    async def get_by_event_id(self, session_id: str, event_id: str) -> SessionEvent | None: ...

    async def list_since(
        self,
        session_id: str,
        *,
        since_seq: int = 0,
        limit: int = 100,
    ) -> list[SessionEvent]: ...

    async def next_seq(self, session_id: str) -> int: ...

    async def has_accepted_photo(self, session_id: str, step_index: int) -> bool: ...


class IPhotoRepository(Protocol):
    """Persistencia de fotos de evidencia."""

    async def save(self, photo: EvidencePhoto) -> None: ...

    async def get_by_id(self, photo_id: str) -> EvidencePhoto | None: ...

    async def get_by_id_for_technician(
        self,
        photo_id: str,
        *,
        technician_id: str,
    ) -> EvidencePhoto | None: ...

    async def get_by_event_id(self, session_id: str, event_id: str) -> EvidencePhoto | None: ...

    async def count_rejected_for_step(self, session_id: str, step_index: int) -> int: ...
