"""Hash de contraseñas con bcrypt — BE-01."""

from __future__ import annotations

import bcrypt


class BcryptPasswordHasher:
    """Implementación bcrypt configurable."""

    def __init__(self, *, rounds: int = 10) -> None:
        self._rounds = rounds

    def hash(self, password: str) -> str:
        salt = bcrypt.gensalt(rounds=self._rounds)
        hashed = bcrypt.hashpw(password.encode("utf-8"), salt)
        return hashed.decode("utf-8")

    def verify(self, password: str, password_hash: str) -> bool:
        return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8"))
