"""Tests HmacSignatureValidator — BE-06."""

import hashlib
import hmac
import json
import time

import pytest

from domain.exceptions import UnauthorizedError
from infrastructure.persistence.in_memory.clock import InMemoryClock
from infrastructure.security.signature import HmacSignatureValidator

SECRET = "test-webhook-secret"


@pytest.fixture
def validator() -> HmacSignatureValidator:
    return HmacSignatureValidator(
        secret=SECRET,
        window_seconds=300,
        clock=InMemoryClock.shared(),
    )


def _sign(payload: bytes, secret: str = SECRET) -> str:
    ts = str(int(time.time()))
    sig = hmac.new(
        secret.encode(),
        f"{ts}.{payload.decode()}".encode(),
        hashlib.sha256,
    ).hexdigest()
    return f"t={ts},v1={sig}"


def test_valid_signature_passes(validator: HmacSignatureValidator) -> None:
    clock = InMemoryClock.shared()
    ts = str(int(clock.now().timestamp()))
    payload = json.dumps({"event": "utterance.final"}).encode()
    sig = hmac.new(
        SECRET.encode(),
        f"{ts}.{payload.decode()}".encode(),
        hashlib.sha256,
    ).hexdigest()
    validator.validate(payload=payload, signature_header=f"t={ts},v1={sig}")


def test_wrong_signature_raises(validator: HmacSignatureValidator) -> None:
    payload = json.dumps({"event": "test"}).encode()
    with pytest.raises(UnauthorizedError) as exc:
        validator.validate(payload=payload, signature_header="t=123,v1=deadbeef")
    assert exc.value.code == "INVALID_SIGNATURE"


def test_missing_signature_raises(validator: HmacSignatureValidator) -> None:
    with pytest.raises(UnauthorizedError) as exc:
        validator.validate(payload=b"{}", signature_header=None)
    assert exc.value.code == "INVALID_SIGNATURE"


def test_expired_timestamp_raises(validator: HmacSignatureValidator) -> None:
    payload = json.dumps({"event": "test"}).encode()
    clock = InMemoryClock.shared()
    old_ts = str(int(clock.now().timestamp()) - 600)
    sig = hmac.new(
        SECRET.encode(),
        f"{old_ts}.{payload.decode()}".encode(),
        hashlib.sha256,
    ).hexdigest()
    header = f"t={old_ts},v1={sig}"

    with pytest.raises(UnauthorizedError) as exc:
        validator.validate(payload=payload, signature_header=header)
    assert "expirado" in exc.value.message.lower()
