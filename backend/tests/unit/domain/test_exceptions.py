"""Tests de jerarquía de excepciones de dominio — BE-00."""

from domain.exceptions import DomainError, ForbiddenError, NotFoundError, ValidationError


def test_domain_error_has_code_and_message() -> None:
    err = DomainError(code="INTERNAL_ERROR", message="algo falló")
    assert err.code == "INTERNAL_ERROR"
    assert err.message == "algo falló"
    assert str(err) == "algo falló"


def test_not_found_error_inherits_domain_error() -> None:
    err = NotFoundError(code="NOT_FOUND", message="no encontrado")
    assert isinstance(err, DomainError)
    assert err.code == "NOT_FOUND"


def test_validation_error_inherits_domain_error() -> None:
    err = ValidationError(code="VALIDATION_ERROR", message="inválido")
    assert isinstance(err, DomainError)
    assert err.code == "VALIDATION_ERROR"


def test_forbidden_error_inherits_domain_error() -> None:
    err = ForbiddenError(code="FORBIDDEN", message="prohibido")
    assert isinstance(err, DomainError)
    assert err.code == "FORBIDDEN"


def test_domain_error_accepts_optional_details() -> None:
    err = DomainError(code="VALIDATION_ERROR", message="campo inválido", details={"field": "email"})
    assert err.details == {"field": "email"}
