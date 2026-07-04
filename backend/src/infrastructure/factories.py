"""Factories de infraestructura — BE-00/BE-01/BE-02."""

from __future__ import annotations

from domain.ports.repositories import (
    IAssetRepository,
    IProcedureTemplateRepository,
    ISessionRepository,
    ITokenBlacklist,
    IUserRepository,
    IWorkOrderRepository,
)
from domain.ports.services import IClock, IPasswordHasher, ITokenService
from domain.services.password_hasher import BcryptPasswordHasher
from domain.services.system_clock import SystemClock
from domain.services.token_service import JwtTokenService
from infrastructure.config import Settings
from infrastructure.persistence.in_memory.asset_repository import InMemoryAssetRepository
from infrastructure.persistence.in_memory.clock import InMemoryClock
from infrastructure.persistence.in_memory.procedure_template_repository import (
    InMemoryProcedureTemplateRepository,
)
from infrastructure.persistence.in_memory.session_repository import InMemorySessionRepository
from infrastructure.persistence.in_memory.token_blacklist import InMemoryTokenBlacklist
from infrastructure.persistence.in_memory.user_repository import InMemoryUserRepository
from infrastructure.persistence.in_memory.work_order_repository import InMemoryWorkOrderRepository
from infrastructure.persistence.supabase.asset_repository import SupabaseAssetRepository
from infrastructure.persistence.supabase.procedure_template_repository import (
    SupabaseProcedureTemplateRepository,
)
from infrastructure.persistence.supabase.session_repository import SupabaseSessionRepository
from infrastructure.persistence.supabase.user_repository import SupabaseUserRepository
from infrastructure.persistence.supabase.work_order_repository import SupabaseWorkOrderRepository

_settings: Settings | None = None


def get_settings() -> Settings:
    """Devuelve settings singleton (lazy)."""
    global _settings
    if _settings is None:
        _settings = Settings()
    return _settings


def reset_settings() -> None:
    """Resetea singleton — útil en tests."""
    global _settings
    _settings = None


def set_settings(settings: Settings) -> None:
    """Inyecta settings — usado por create_app en tests."""
    global _settings
    _settings = settings


def get_clock(settings: Settings | None = None) -> IClock:
    """Factory de reloj según CLOCK_MODE."""
    cfg = settings or get_settings()
    if cfg.CLOCK_MODE == "memory":
        return InMemoryClock.shared()
    return SystemClock()


def get_user_repository(settings: Settings | None = None) -> IUserRepository:
    cfg = settings or get_settings()
    if cfg.AUTH == "memory":
        return InMemoryUserRepository.shared()
    if cfg.AUTH == "supabase_auth":
        return SupabaseUserRepository()
    raise ValueError(f"AUTH={cfg.AUTH} no soportado")


def get_password_hasher(settings: Settings | None = None) -> IPasswordHasher:
    cfg = settings or get_settings()
    return BcryptPasswordHasher(rounds=cfg.PASSWORD_BCRYPT_ROUNDS)


def get_token_service(settings: Settings | None = None) -> ITokenService:
    cfg = settings or get_settings()
    return JwtTokenService(
        secret=cfg.JWT_SECRET,
        algorithm=cfg.JWT_ALGORITHM,
        access_ttl_seconds=cfg.ACCESS_TOKEN_TTL_SECONDS,
        refresh_ttl_seconds=cfg.REFRESH_TOKEN_TTL_SECONDS,
        clock=get_clock(cfg),
    )


def get_token_blacklist() -> ITokenBlacklist:
    return InMemoryTokenBlacklist.shared()


def get_work_order_repository(settings: Settings | None = None) -> IWorkOrderRepository:
    cfg = settings or get_settings()
    if cfg.PERSISTENCE == "memory":
        return InMemoryWorkOrderRepository.shared()
    if cfg.PERSISTENCE == "supabase":
        return SupabaseWorkOrderRepository()
    raise ValueError(f"PERSISTENCE={cfg.PERSISTENCE} no soportado")


def get_procedure_template_repository(
    settings: Settings | None = None,
) -> IProcedureTemplateRepository:
    cfg = settings or get_settings()
    if cfg.PERSISTENCE == "memory":
        return InMemoryProcedureTemplateRepository.shared()
    if cfg.PERSISTENCE == "supabase":
        return SupabaseProcedureTemplateRepository()
    raise ValueError(f"PERSISTENCE={cfg.PERSISTENCE} no soportado")


def get_asset_repository(settings: Settings | None = None) -> IAssetRepository:
    cfg = settings or get_settings()
    if cfg.PERSISTENCE == "memory":
        return InMemoryAssetRepository.shared()
    if cfg.PERSISTENCE == "supabase":
        return SupabaseAssetRepository()
    raise ValueError(f"PERSISTENCE={cfg.PERSISTENCE} no soportado")


def get_session_repository(settings: Settings | None = None) -> ISessionRepository:
    cfg = settings or get_settings()
    if cfg.PERSISTENCE == "memory":
        return InMemorySessionRepository.shared()
    if cfg.PERSISTENCE == "supabase":
        return SupabaseSessionRepository()
    raise ValueError(f"PERSISTENCE={cfg.PERSISTENCE} no soportado")


def get_login_use_case():
    from application.use_cases.auth.login import LoginUseCase

    cfg = get_settings()
    return LoginUseCase(
        users=get_user_repository(cfg),
        hasher=get_password_hasher(cfg),
        tokens=get_token_service(cfg),
        blacklist=get_token_blacklist(),
        access_ttl_seconds=cfg.ACCESS_TOKEN_TTL_SECONDS,
    )


def get_refresh_use_case():
    from application.use_cases.auth.refresh import RefreshUseCase

    cfg = get_settings()
    return RefreshUseCase(
        users=get_user_repository(cfg),
        tokens=get_token_service(cfg),
        blacklist=get_token_blacklist(),
        access_ttl_seconds=cfg.ACCESS_TOKEN_TTL_SECONDS,
    )


def get_logout_use_case():
    from application.use_cases.auth.logout import LogoutUseCase

    return LogoutUseCase(
        tokens=get_token_service(),
        blacklist=get_token_blacklist(),
    )


def get_me_use_case():
    from application.use_cases.auth.get_me import GetMeUseCase

    return GetMeUseCase(users=get_user_repository())


def get_list_work_orders_use_case():
    from application.use_cases.work_orders.list import ListWorkOrdersUseCase

    cfg = get_settings()
    return ListWorkOrdersUseCase(
        work_orders=get_work_order_repository(cfg),
        assets=get_asset_repository(cfg),
        templates=get_procedure_template_repository(cfg),
        users=get_user_repository(cfg),
    )


def get_work_order_use_case():
    from application.use_cases.work_orders.get import GetWorkOrderUseCase

    cfg = get_settings()
    return GetWorkOrderUseCase(
        work_orders=get_work_order_repository(cfg),
        assets=get_asset_repository(cfg),
        templates=get_procedure_template_repository(cfg),
        users=get_user_repository(cfg),
    )


def get_start_session_use_case():
    from application.use_cases.work_orders.start_session import StartSessionUseCase

    cfg = get_settings()
    return StartSessionUseCase(
        work_orders=get_work_order_repository(cfg),
        sessions=get_session_repository(cfg),
        templates=get_procedure_template_repository(cfg),
        clock=get_clock(cfg),
    )


def get_session_use_case():
    from application.use_cases.sessions.get import GetSessionUseCase

    cfg = get_settings()
    return GetSessionUseCase(sessions=get_session_repository(cfg))


async def reset_auth_state() -> None:
    """Resetea repos y blacklist in-memory entre tests."""
    InMemoryUserRepository.reset_singleton()
    InMemoryTokenBlacklist.reset_singleton()
    InMemoryClock.shared().reset()
    InMemoryWorkOrderRepository.reset_singleton()
    InMemoryProcedureTemplateRepository.reset_singleton()
    InMemoryAssetRepository.reset_singleton()
    InMemorySessionRepository.reset_singleton()
    await InMemorySessionRepository.shared().reset()
