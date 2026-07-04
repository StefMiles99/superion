"""Acciones auditables — BE-08."""

from enum import StrEnum


class AuditAction(StrEnum):
    """Acciones registradas en el audit log."""

    LOGIN = "login"
    LOGOUT = "logout"
    START_SESSION = "start_session"
    FINALIZE_SESSION = "finalize_session"
    MANUAL_UPLOAD = "manual_upload"
    MANUAL_ARCHIVE = "manual_archive"
    ADMIN_OVERRIDE = "admin_override"
