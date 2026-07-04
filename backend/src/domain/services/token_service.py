"""Servicio JWT HS256 — BE-01."""

from __future__ import annotations

import uuid
from datetime import timedelta
from typing import Any

import jwt

from domain.entities.user import User
from domain.ports.services import IClock
from domain.value_objects.auth import AccessToken, RefreshToken


class TokenExpiredError(Exception):
    """Token JWT expirado."""


class InvalidTokenError(Exception):
    """Token JWT inválido."""


class JwtTokenService:
    """Emite y valida tokens con claims custom."""

    def __init__(
        self,
        *,
        secret: str,
        algorithm: str,
        access_ttl_seconds: int,
        refresh_ttl_seconds: int,
        clock: IClock,
    ) -> None:
        self._secret = secret
        self._algorithm = algorithm
        self._access_ttl_seconds = access_ttl_seconds
        self._refresh_ttl_seconds = refresh_ttl_seconds
        self._clock = clock

    def create_access_token(self, user: User) -> AccessToken:
        return self._create_token(user, token_type="access", ttl_seconds=self._access_ttl_seconds)

    def create_refresh_token(self, user: User) -> RefreshToken:
        token = self._create_token(
            user,
            token_type="refresh",
            ttl_seconds=self._refresh_ttl_seconds,
        )
        return RefreshToken(value=token.value, exp=token.exp, jti=token.jti)

    def decode_access_token(self, token: str) -> dict[str, Any]:
        return self._decode(token, expected_type="access")

    def decode_refresh_token(self, token: str) -> dict[str, Any]:
        return self._decode(token, expected_type="refresh")

    def _create_token(self, user: User, *, token_type: str, ttl_seconds: int) -> AccessToken:
        now = self._clock.now()
        jti = str(uuid.uuid4())
        exp = now + timedelta(seconds=ttl_seconds)
        payload = {
            "sub": user.id,
            "email": user.email,
            "role": user.role.value,
            "plant_id": user.plant_id,
            "token_type": token_type,
            "iat": int(now.timestamp()),
            "exp": int(exp.timestamp()),
            "jti": jti,
        }
        encoded = jwt.encode(payload, self._secret, algorithm=self._algorithm)
        return AccessToken(value=encoded, exp=exp, jti=jti)

    def _decode(self, token: str, *, expected_type: str) -> dict[str, Any]:
        try:
            payload = jwt.decode(
                token,
                self._secret,
                algorithms=[self._algorithm],
                options={
                    "require": ["exp", "sub", "jti", "token_type"],
                    "verify_exp": False,
                },
            )
        except jwt.ExpiredSignatureError as exc:
            raise TokenExpiredError("token expirado") from exc
        except jwt.InvalidTokenError as exc:
            raise InvalidTokenError("token inválido") from exc

        if payload.get("token_type") != expected_type:
            raise InvalidTokenError("tipo de token inválido")

        now_ts = int(self._clock.now().timestamp())
        if now_ts >= int(payload["exp"]):
            raise TokenExpiredError("token expirado")

        return payload
