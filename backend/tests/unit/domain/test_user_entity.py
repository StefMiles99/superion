"""Tests de entidad User — BE-01."""

import pytest

from domain.entities.user import User
from domain.value_objects.role import Role


def test_user_has_required_fields() -> None:
    user = User(
        id="tech-1",
        email="juan@planta.com",
        password_hash="$2b$10$hash",
        full_name="Juan Pérez",
        role=Role.TECHNICIAN,
        plant_id="plant-1",
    )
    assert user.id == "tech-1"
    assert user.email == "juan@planta.com"
    assert user.role == Role.TECHNICIAN
    assert user.plant_id == "plant-1"
    assert user.is_blocked is False


def test_user_role_values_are_lowercase() -> None:
    assert Role.TECHNICIAN == "technician"
    assert Role.SUPERVISOR == "supervisor"
    assert Role.RAG_ADMIN == "rag_admin"


def test_blocked_user_flag() -> None:
    user = User(
        id="tech-blocked",
        email="blocked@planta.com",
        password_hash="$2b$10$hash",
        full_name="Bloqueado",
        role=Role.TECHNICIAN,
        plant_id="plant-1",
        is_blocked=True,
    )
    assert user.is_blocked is True


def test_user_rejects_empty_email() -> None:
    with pytest.raises(ValueError, match="email"):
        User(
            id="x",
            email="",
            password_hash="hash",
            full_name="X",
            role=Role.TECHNICIAN,
            plant_id="plant-1",
        )
