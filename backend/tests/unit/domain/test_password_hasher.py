"""Tests de BcryptPasswordHasher — BE-01."""

from domain.services.password_hasher import BcryptPasswordHasher


def test_hash_and_verify_roundtrip() -> None:
    hasher = BcryptPasswordHasher(rounds=4)
    password = "test1234"
    hashed = hasher.hash(password)
    assert hashed != password
    assert hasher.verify(password, hashed) is True


def test_verify_rejects_wrong_password() -> None:
    hasher = BcryptPasswordHasher(rounds=4)
    hashed = hasher.hash("test1234")
    assert hasher.verify("wrong-password", hashed) is False


def test_respects_configured_rounds() -> None:
    hasher = BcryptPasswordHasher(rounds=4)
    hashed = hasher.hash("test1234")
    assert hashed.startswith("$2b$04$")
