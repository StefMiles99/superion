"""Repositorio in-memory de usuarios — BE-01."""

from __future__ import annotations

import asyncio

from domain.entities.user import User
from domain.services.password_hasher import BcryptPasswordHasher
from domain.value_objects.role import Role


class InMemoryUserRepository:
    """Usuarios sembrados para desarrollo y tests."""

    _instance: InMemoryUserRepository | None = None

    def __init__(self, users: list[User]) -> None:
        self._users_by_id = {user.id: user for user in users}
        self._users_by_email = {user.email: user for user in users}
        self._lock = asyncio.Lock()

    @classmethod
    def with_fixtures(cls, *, password: str, rounds: int = 10) -> InMemoryUserRepository:
        hasher = BcryptPasswordHasher(rounds=rounds)
        password_hash = hasher.hash(password)
        users = [
            User(
                id="tech-1",
                email="juan@planta.com",
                password_hash=password_hash,
                full_name="Juan Pérez",
                role=Role.TECHNICIAN,
                plant_id="plant-1",
            ),
            User(
                id="tech-2",
                email="maria@planta.com",
                password_hash=password_hash,
                full_name="María López",
                role=Role.TECHNICIAN,
                plant_id="plant-1",
            ),
            User(
                id="tech-3",
                email="pedro@planta.com",
                password_hash=password_hash,
                full_name="Pedro Gómez",
                role=Role.TECHNICIAN,
                plant_id="plant-1",
            ),
            User(
                id="sup-1",
                email="supervisor@planta.com",
                password_hash=password_hash,
                full_name="Ana Supervisor",
                role=Role.SUPERVISOR,
                plant_id="plant-1",
            ),
            User(
                id="admin-ana",
                email="ana@planta.com",
                password_hash=password_hash,
                full_name="Ana Gómez",
                role=Role.RAG_ADMIN,
                plant_id="plant-1",
            ),
            User(
                id="admin-1",
                email="admin@planta.com",
                password_hash=password_hash,
                full_name="Admin RAG",
                role=Role.RAG_ADMIN,
                plant_id="plant-1",
            ),
            User(
                id="tech-blocked",
                email="blocked@planta.com",
                password_hash=password_hash,
                full_name="Usuario Bloqueado",
                role=Role.TECHNICIAN,
                plant_id="plant-1",
                is_blocked=True,
            ),
        ]
        return cls(users)

    @classmethod
    def reset_singleton(cls) -> None:
        cls._instance = None

    @classmethod
    def shared(cls) -> InMemoryUserRepository:
        if cls._instance is None:
            from infrastructure.factories import get_settings

            cfg = get_settings()
            cls._instance = cls.with_fixtures(
                password="test1234",
                rounds=cfg.PASSWORD_BCRYPT_ROUNDS,
            )
        return cls._instance

    async def get_by_id(self, user_id: str) -> User | None:
        async with self._lock:
            return self._users_by_id.get(user_id)

    async def get_by_email(self, email: str) -> User | None:
        async with self._lock:
            return self._users_by_email.get(email)

    async def reset(self) -> None:
        from infrastructure.factories import get_settings

        cfg = get_settings()
        async with self._lock:
            fresh = self.with_fixtures(
                password="test1234",
                rounds=cfg.PASSWORD_BCRYPT_ROUNDS,
            )
            self._users_by_id = fresh._users_by_id
            self._users_by_email = fresh._users_by_email
