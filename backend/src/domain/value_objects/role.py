"""Roles de usuario — BE-01."""

from enum import StrEnum


class Role(StrEnum):
    """Roles soportados por la API (valores en minúsculas según contrato)."""

    TECHNICIAN = "technician"
    SUPERVISOR = "supervisor"
    RAG_ADMIN = "rag_admin"
