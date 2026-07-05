"""Factories de infraestructura — BE-00/BE-01/BE-02."""

from __future__ import annotations

from domain.ports.event_bus import IEventBus
from domain.ports.repositories import (
    IAssetRepository,
    IAuditLogRepository,
    IManualChunkRepository,
    IManualRepository,
    IPhotoRepository,
    IProcedureTemplateRepository,
    ISessionEventRepository,
    ISessionRepository,
    ITokenBlacklist,
    IUserRepository,
    IWorkOrderRepository,
)
from domain.ports.services import (
    IChunkerService,
    IClock,
    IEmbeddingService,
    IPasswordHasher,
    IPdfExtractor,
    IPhotoValidator,
    IRerankerService,
    ITokenService,
)
from domain.ports.storage import IObjectStorage
from domain.services.password_hasher import BcryptPasswordHasher
from domain.services.photo_validator import MockPhotoValidator
from domain.services.system_clock import SystemClock
from domain.services.token_service import JwtTokenService
from infrastructure.config import Settings
from infrastructure.observability.metrics import InMemoryMetricsCollector
from infrastructure.persistence.in_memory.asset_repository import InMemoryAssetRepository
from infrastructure.persistence.in_memory.audit_log_repository import InMemoryAuditLogRepository
from infrastructure.persistence.in_memory.clock import InMemoryClock
from infrastructure.persistence.in_memory.manual_chunk_repository import (
    InMemoryManualChunkRepository,
)
from infrastructure.persistence.in_memory.manual_repository import InMemoryManualRepository
from infrastructure.persistence.in_memory.photo_repository import InMemoryPhotoRepository
from infrastructure.persistence.in_memory.procedure_template_repository import (
    InMemoryProcedureTemplateRepository,
)
from infrastructure.persistence.in_memory.session_event_repository import (
    InMemorySessionEventRepository,
)
from infrastructure.persistence.in_memory.session_repository import InMemorySessionRepository
from infrastructure.persistence.in_memory.token_blacklist import InMemoryTokenBlacklist
from infrastructure.persistence.in_memory.user_repository import InMemoryUserRepository
from infrastructure.persistence.in_memory.work_order_repository import InMemoryWorkOrderRepository
from infrastructure.persistence.supabase.asset_repository import SupabaseAssetRepository
from infrastructure.persistence.supabase.audit_log_repository import SupabaseAuditLogRepository
from infrastructure.persistence.supabase.manual_chunk_repository import (
    SupabaseManualChunkRepository,
)
from infrastructure.persistence.supabase.manual_repository import SupabaseManualRepository
from infrastructure.persistence.supabase.photo_repository import SupabasePhotoRepository
from infrastructure.persistence.supabase.procedure_template_repository import (
    SupabaseProcedureTemplateRepository,
)
from infrastructure.persistence.supabase.session_event_repository import (
    SupabaseSessionEventRepository,
)
from infrastructure.persistence.supabase.session_repository import SupabaseSessionRepository
from infrastructure.persistence.supabase.user_repository import SupabaseUserRepository
from infrastructure.persistence.supabase.work_order_repository import SupabaseWorkOrderRepository
from infrastructure.realtime.event_bus import InMemoryEventBus
from infrastructure.security.rate_limiter import InMemoryRateLimiter, NoOpRateLimiter
from infrastructure.services.chunker import HierarchicalChunker
from infrastructure.services.embedding_service import MockEmbeddingService
from infrastructure.services.pdf_extractor import MockPdfExtractor
from infrastructure.services.reranker import MockReranker
from infrastructure.storage.in_memory import InMemoryObjectStorage
from infrastructure.storage.supabase import SupabaseObjectStorage

_settings: Settings | None = None
_rate_limiter: InMemoryRateLimiter | NoOpRateLimiter | None = None
_rate_limiter_key: tuple[bool, int, str] | None = None


def get_settings() -> Settings:
    """Devuelve settings singleton (lazy)."""
    global _settings
    if _settings is None:
        _settings = Settings()
    return _settings


def reset_settings() -> None:
    """Resetea singleton — útil en tests."""
    global _settings, _rate_limiter, _rate_limiter_key
    _settings = None
    _rate_limiter = None
    _rate_limiter_key = None


def set_settings(settings: Settings) -> None:
    """Inyecta settings — usado por create_app en tests."""
    global _settings, _rate_limiter, _rate_limiter_key
    _settings = settings
    _rate_limiter = None
    _rate_limiter_key = None


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


def get_session_event_repository(settings: Settings | None = None) -> ISessionEventRepository:
    cfg = settings or get_settings()
    if cfg.PERSISTENCE == "memory":
        return InMemorySessionEventRepository.shared()
    if cfg.PERSISTENCE == "supabase":
        return SupabaseSessionEventRepository()
    raise ValueError(f"PERSISTENCE={cfg.PERSISTENCE} no soportado")


def get_event_bus(settings: Settings | None = None) -> IEventBus:
    cfg = settings or get_settings()
    if cfg.EVENTBUS == "memory":
        return InMemoryEventBus.shared()
    raise ValueError(f"EVENTBUS={cfg.EVENTBUS} no soportado")


def get_object_storage(settings: Settings | None = None) -> IObjectStorage:
    cfg = settings or get_settings()
    if cfg.STORAGE == "memory":
        return InMemoryObjectStorage.shared(base_url=cfg.API_BASE_URL)
    if cfg.STORAGE == "supabase":
        return SupabaseObjectStorage()
    raise ValueError(f"STORAGE={cfg.STORAGE} no soportado")


def get_photo_repository(settings: Settings | None = None) -> IPhotoRepository:
    cfg = settings or get_settings()
    if cfg.PERSISTENCE == "memory":
        return InMemoryPhotoRepository.shared()
    if cfg.PERSISTENCE == "supabase":
        return SupabasePhotoRepository()
    raise ValueError(f"PERSISTENCE={cfg.PERSISTENCE} no soportado")


def get_photo_validator(settings: Settings | None = None) -> IPhotoValidator:
    cfg = settings or get_settings()
    if cfg.PHOTO_VALIDATOR == "mock":
        return MockPhotoValidator()
    raise ValueError(f"PHOTO_VALIDATOR={cfg.PHOTO_VALIDATOR} no soportado")


def get_append_event_use_case():
    from application.use_cases.events.append import AppendEventUseCase

    cfg = get_settings()
    return AppendEventUseCase(
        sessions=get_session_repository(cfg),
        events=get_session_event_repository(cfg),
        bus=get_event_bus(cfg),
        clock=get_clock(cfg),
    )


def get_list_events_use_case():
    from application.use_cases.events.list_since import ListEventsSinceUseCase

    cfg = get_settings()
    return ListEventsSinceUseCase(
        sessions=get_session_repository(cfg),
        events=get_session_event_repository(cfg),
    )


def get_pause_session_use_case():
    from application.use_cases.sessions.pause import PauseSessionUseCase

    return PauseSessionUseCase(
        sessions=get_session_repository(),
        append_events=get_append_event_use_case(),
    )


def get_resume_session_use_case():
    from application.use_cases.sessions.resume import ResumeSessionUseCase

    return ResumeSessionUseCase(
        sessions=get_session_repository(),
        append_events=get_append_event_use_case(),
    )


def get_transition_step_use_case():
    from application.use_cases.sessions.transition_step import TransitionStepUseCase

    cfg = get_settings()
    return TransitionStepUseCase(
        sessions=get_session_repository(cfg),
        work_orders=get_work_order_repository(cfg),
        templates=get_procedure_template_repository(cfg),
        events=get_session_event_repository(cfg),
        append_events=get_append_event_use_case(),
    )


def get_post_session_event_use_case():
    from application.use_cases.events.post import PostSessionEventUseCase

    return PostSessionEventUseCase(
        append_events=get_append_event_use_case(),
        pause_session=get_pause_session_use_case(),
        resume_session=get_resume_session_use_case(),
        transition_step=get_transition_step_use_case(),
    )


def get_finalize_session_use_case():
    from application.use_cases.sessions.finalize import FinalizeSessionUseCase

    cfg = get_settings()
    return FinalizeSessionUseCase(
        sessions=get_session_repository(cfg),
        append_events=get_append_event_use_case(),
        clock=get_clock(cfg),
    )


def get_session_use_case():
    from application.use_cases.sessions.get import GetSessionUseCase

    cfg = get_settings()
    return GetSessionUseCase(
        sessions=get_session_repository(cfg),
        events=get_session_event_repository(cfg),
    )


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


def get_validate_photo_use_case():
    from application.use_cases.photos.validate import ValidatePhotoUseCase

    cfg = get_settings()
    return ValidatePhotoUseCase(
        photos=get_photo_repository(cfg),
        storage=get_object_storage(cfg),
        validator=get_photo_validator(cfg),
        events=get_session_event_repository(cfg),
        bus=get_event_bus(cfg),
        clock=get_clock(cfg),
        append_events=get_append_event_use_case(),
        max_retries=cfg.PHOTO_MAX_RETRIES,
        signed_url_ttl=cfg.SIGNED_URL_TTL_SECONDS,
    )


def get_upload_photo_use_case():
    from application.use_cases.photos.upload import UploadPhotoUseCase

    cfg = get_settings()
    max_bytes = cfg.PHOTO_MAX_SIZE_MB * 1024 * 1024
    return UploadPhotoUseCase(
        sessions=get_session_repository(cfg),
        photos=get_photo_repository(cfg),
        storage=get_object_storage(cfg),
        events=get_session_event_repository(cfg),
        bus=get_event_bus(cfg),
        clock=get_clock(cfg),
        max_size_bytes=max_bytes,
        signed_url_ttl=cfg.SIGNED_URL_TTL_SECONDS,
        validate_photo_use_case=get_validate_photo_use_case(),
    )


def get_get_photo_use_case():
    from application.use_cases.photos.get import GetPhotoUseCase

    cfg = get_settings()
    return GetPhotoUseCase(
        photos=get_photo_repository(cfg),
        storage=get_object_storage(cfg),
        signed_url_ttl=cfg.SIGNED_URL_TTL_SECONDS,
    )


def get_pdf_extractor(settings: Settings | None = None) -> IPdfExtractor:
    return MockPdfExtractor()


def get_chunker_service(settings: Settings | None = None) -> IChunkerService:
    cfg = settings or get_settings()
    return HierarchicalChunker(
        chunk_size=cfg.CHUNK_SIZE,
        overlap=cfg.CHUNK_OVERLAP,
    )


def get_embedding_service(settings: Settings | None = None) -> IEmbeddingService:
    cfg = settings or get_settings()
    if cfg.EMBEDDING == "mock":
        return MockEmbeddingService(dimensions=cfg.EMBEDDING_DIM)
    raise ValueError(f"EMBEDDING={cfg.EMBEDDING} no soportado")


def get_reranker_service(settings: Settings | None = None) -> IRerankerService:
    cfg = settings or get_settings()
    if cfg.RERANKER == "mock":
        return MockReranker()
    raise ValueError(f"RERANKER={cfg.RERANKER} no soportado")


def get_manual_repository(settings: Settings | None = None) -> IManualRepository:
    cfg = settings or get_settings()
    if cfg.PERSISTENCE == "memory":
        return InMemoryManualRepository.shared()
    if cfg.PERSISTENCE == "supabase":
        return SupabaseManualRepository()
    raise ValueError(f"PERSISTENCE={cfg.PERSISTENCE} no soportado")


def get_manual_chunk_repository(settings: Settings | None = None) -> IManualChunkRepository:
    cfg = settings or get_settings()
    if cfg.PERSISTENCE == "memory":
        return InMemoryManualChunkRepository.shared()
    if cfg.PERSISTENCE == "supabase":
        return SupabaseManualChunkRepository()
    raise ValueError(f"PERSISTENCE={cfg.PERSISTENCE} no soportado")


def get_index_manual_use_case():
    from application.use_cases.manuals.index import IndexManualUseCase

    cfg = get_settings()
    return IndexManualUseCase(
        manuals=get_manual_repository(cfg),
        chunks=get_manual_chunk_repository(cfg),
        storage=get_object_storage(cfg),
        pdf_extractor=get_pdf_extractor(cfg),
        chunker=get_chunker_service(cfg),
        embeddings=get_embedding_service(cfg),
    )


def get_upload_manual_use_case():
    from application.use_cases.manuals.upload import UploadManualUseCase

    cfg = get_settings()
    max_bytes = cfg.MANUAL_MAX_SIZE_MB * 1024 * 1024
    return UploadManualUseCase(
        manuals=get_manual_repository(cfg),
        storage=get_object_storage(cfg),
        clock=get_clock(cfg),
        index_manual=get_index_manual_use_case(),
        max_size_bytes=max_bytes,
        estimated_seconds=cfg.MANUAL_INDEX_ESTIMATED_SECONDS,
    )


def get_list_manuals_use_case():
    from application.use_cases.manuals.list import ListManualsUseCase

    cfg = get_settings()
    return ListManualsUseCase(
        manuals=get_manual_repository(cfg),
        users=get_user_repository(cfg),
    )


def get_get_manual_use_case():
    from application.use_cases.manuals.get import GetManualUseCase

    cfg = get_settings()
    return GetManualUseCase(
        manuals=get_manual_repository(cfg),
        users=get_user_repository(cfg),
        storage=get_object_storage(cfg),
        signed_url_ttl=cfg.SIGNED_URL_TTL_SECONDS,
    )


def get_reindex_manual_use_case():
    from application.use_cases.manuals.reindex import ReindexManualUseCase

    cfg = get_settings()
    return ReindexManualUseCase(
        manuals=get_manual_repository(cfg),
        index_manual=get_index_manual_use_case(),
    )


def get_archive_manual_use_case():
    from application.use_cases.manuals.archive import ArchiveManualUseCase

    return ArchiveManualUseCase(manuals=get_manual_repository())


def get_search_manual_use_case():
    from application.use_cases.manuals.search import SearchManualUseCase

    cfg = get_settings()
    return SearchManualUseCase(
        manuals=get_manual_repository(cfg),
        chunks=get_manual_chunk_repository(cfg),
        embeddings=get_embedding_service(cfg),
        top_k=cfg.RAG_TOP_K,
    )


def get_rag_query_use_case():
    from application.use_cases.rag.query import RagQueryUseCase

    cfg = get_settings()
    return RagQueryUseCase(
        manuals=get_manual_repository(cfg),
        chunks=get_manual_chunk_repository(cfg),
        assets=get_asset_repository(cfg),
        embeddings=get_embedding_service(cfg),
        reranker=get_reranker_service(cfg),
        top_k=cfg.RAG_TOP_K,
        top_n=cfg.RAG_TOP_N,
        abstain_threshold=cfg.RAG_ABSTAIN_THRESHOLD,
    )


def get_signature_validator():
    from infrastructure.security.signature import HmacSignatureValidator

    cfg = get_settings()
    return HmacSignatureValidator(
        secret=cfg.ELEVENLABS_WEBHOOK_SECRET,
        window_seconds=cfg.ELEVENLABS_SIGNATURE_WINDOW_SECONDS,
        clock=get_clock(cfg),
    )


def get_intent_classifier():
    from domain.services.intent_classifier import MockIntentClassifier

    cfg = get_settings()
    if cfg.INTENT_CLASSIFIER == "mock":
        return MockIntentClassifier()
    raise ValueError(f"INTENT_CLASSIFIER={cfg.INTENT_CLASSIFIER} no soportado")


def get_tool_query_manual_use_case():
    from application.use_cases.voice.tool_query_manual import ToolQueryManualUseCase

    cfg = get_settings()
    return ToolQueryManualUseCase(
        sessions=get_session_repository(cfg),
        work_orders=get_work_order_repository(cfg),
        assets=get_asset_repository(cfg),
        rag_query=get_rag_query_use_case(),
        append_events=get_append_event_use_case(),
    )


def get_tool_mark_step_complete_use_case():
    from application.use_cases.voice.tool_mark_step_complete import ToolMarkStepCompleteUseCase

    cfg = get_settings()
    return ToolMarkStepCompleteUseCase(
        sessions=get_session_repository(cfg),
        transition_step=get_transition_step_use_case(),
        append_events=get_append_event_use_case(),
    )


def get_tool_request_photo_use_case():
    from application.use_cases.voice.tool_request_photo import ToolRequestPhotoUseCase

    return ToolRequestPhotoUseCase(
        sessions=get_session_repository(),
        append_events=get_append_event_use_case(),
    )


def get_tool_add_finding_use_case():
    from application.use_cases.voice.tool_add_finding import ToolAddFindingUseCase

    return ToolAddFindingUseCase(
        sessions=get_session_repository(),
        append_events=get_append_event_use_case(),
    )


def get_tool_add_measurement_use_case():
    from application.use_cases.voice.tool_add_measurement import ToolAddMeasurementUseCase

    return ToolAddMeasurementUseCase(
        sessions=get_session_repository(),
        append_events=get_append_event_use_case(),
    )


def get_execute_tool_use_case():
    from application.use_cases.voice.execute_tool import ExecuteToolUseCase

    return ExecuteToolUseCase(
        query_manual=get_tool_query_manual_use_case(),
        mark_step_complete=get_tool_mark_step_complete_use_case(),
        request_photo=get_tool_request_photo_use_case(),
        add_finding=get_tool_add_finding_use_case(),
        add_measurement=get_tool_add_measurement_use_case(),
        transition_step=get_transition_step_use_case(),
        pause_session=get_pause_session_use_case(),
    )


def get_classify_and_route_use_case():
    from application.use_cases.voice.classify_and_route import ClassifyAndRouteUseCase

    return ClassifyAndRouteUseCase(
        sessions=get_session_repository(),
        classifier=get_intent_classifier(),
        execute_tool=get_execute_tool_use_case(),
        add_measurement=get_tool_add_measurement_use_case(),
    )


def get_langgraph_client():
    from infrastructure.realtime.langgraph_client import MockLangGraphClient

    cfg = get_settings()
    if cfg.LANGGRAPH == "mock":
        return MockLangGraphClient.shared(execute_tool=get_execute_tool_use_case())
    raise ValueError(f"LANGGRAPH={cfg.LANGGRAPH} no soportado")


def get_handle_webhook_use_case():
    from application.use_cases.voice.handle_webhook import HandleWebhookUseCase

    cfg = get_settings()
    return HandleWebhookUseCase(
        signature_validator=get_signature_validator(),
        sessions=get_session_repository(cfg),
        users=get_user_repository(cfg),
        classify_and_route=get_classify_and_route_use_case(),
        pause_session=get_pause_session_use_case(),
        langgraph=get_langgraph_client(),
    )


def get_audit_log_repository(settings: Settings | None = None) -> IAuditLogRepository:
    cfg = settings or get_settings()
    if cfg.AUDIT_LOG == "memory":
        return InMemoryAuditLogRepository.shared()
    if cfg.AUDIT_LOG == "supabase":
        return SupabaseAuditLogRepository()
    raise ValueError(f"AUDIT_LOG={cfg.AUDIT_LOG} no soportado")


def get_log_audit_entry_use_case():
    from application.use_cases.audit.log import LogAuditEntryUseCase

    cfg = get_settings()
    return LogAuditEntryUseCase(
        audit_log=get_audit_log_repository(cfg),
        clock=get_clock(cfg),
    )


def get_list_audit_entries_use_case():
    from application.use_cases.audit.list import ListAuditEntriesUseCase

    return ListAuditEntriesUseCase(audit_log=get_audit_log_repository())


def get_metrics_collector(settings: Settings | None = None) -> InMemoryMetricsCollector:
    cfg = settings or get_settings()
    if cfg.METRICS == "memory":
        collector = InMemoryMetricsCollector.shared()
        if not collector._counters and not collector._histograms and not collector._gauges:
            collector.counter("http_up", "API process is up").inc(1)
        return collector
    if cfg.METRICS == "prometheus":
        collector = InMemoryMetricsCollector.shared()
        if not collector._counters and not collector._histograms and not collector._gauges:
            collector.counter("http_up", "API process is up").inc(1)
        return collector
    raise ValueError(f"METRICS={cfg.METRICS} no soportado")


def get_rate_limiter(settings: Settings | None = None) -> InMemoryRateLimiter | NoOpRateLimiter:
    global _rate_limiter, _rate_limiter_key
    cfg = settings or get_settings()
    key = (cfg.RATE_LIMIT_ENABLED, cfg.RATE_LIMIT_PER_MIN, cfg.CLOCK_MODE)
    if _rate_limiter is None or _rate_limiter_key != key:
        if not cfg.RATE_LIMIT_ENABLED:
            _rate_limiter = NoOpRateLimiter()
        else:
            _rate_limiter = InMemoryRateLimiter(
                limit_per_minute=cfg.RATE_LIMIT_PER_MIN,
                clock=get_clock(cfg),
            )
        _rate_limiter_key = key
    return _rate_limiter


async def reset_auth_state() -> None:
    """Resetea repos y blacklist in-memory entre tests."""
    InMemoryUserRepository.reset_singleton()
    InMemoryTokenBlacklist.reset_singleton()
    InMemoryClock.shared().reset()
    InMemoryWorkOrderRepository.reset_singleton()
    InMemoryProcedureTemplateRepository.reset_singleton()
    InMemoryAssetRepository.reset_singleton()
    InMemorySessionRepository.reset_singleton()
    InMemorySessionEventRepository.reset_singleton()
    InMemoryPhotoRepository.reset_singleton()
    InMemoryManualRepository.reset_singleton()
    InMemoryManualChunkRepository.reset_singleton()
    InMemoryObjectStorage.reset_singleton()
    InMemoryEventBus.reset_singleton()
    InMemoryAuditLogRepository.reset_singleton()
    InMemoryMetricsCollector.reset_singleton()
    global _rate_limiter, _rate_limiter_key
    _rate_limiter = None
    _rate_limiter_key = None
    from infrastructure.realtime.langgraph_client import MockLangGraphClient

    MockLangGraphClient.reset_singleton()
    from interface.ws.manager import ConnectionManager

    ConnectionManager.reset_singleton()
    await InMemorySessionRepository.shared().reset()
    await InMemorySessionEventRepository.shared().reset()
    await InMemoryPhotoRepository.shared().reset()
    await InMemoryManualRepository.shared().reset()
    await InMemoryManualChunkRepository.shared().reset()
    cfg = get_settings()
    await InMemoryObjectStorage.shared(base_url=cfg.API_BASE_URL).reset()
    await InMemoryEventBus.shared().reset()
    await InMemoryAuditLogRepository.shared().reset()
    await InMemoryMetricsCollector.shared().reset()
    limiter = get_rate_limiter()
    await limiter.reset()
    await MockLangGraphClient.shared().reset()
    await ConnectionManager.shared().reset()
    from infrastructure.external.elevenlabs.in_memory_provisioner import InMemoryElevenLabsProvisioner

    InMemoryElevenLabsProvisioner.reset_singleton()


def get_elevenlabs_provisioner(settings: Settings | None = None):
    from infrastructure.external.elevenlabs.in_memory_provisioner import InMemoryElevenLabsProvisioner
    from infrastructure.external.elevenlabs.provisioner import ElevenLabsSdkProvisioner

    cfg = settings or get_settings()
    if cfg.ELEVENLABS_PROVISIONER == "memory":
        return InMemoryElevenLabsProvisioner.shared(clock=get_clock(cfg))
    if cfg.ELEVENLABS_PROVISIONER == "api":
        if not cfg.ELEVENLABS_API_KEY:
            raise ValueError("ELEVENLABS_API_KEY requerido cuando ELEVENLABS_PROVISIONER=api")
        return ElevenLabsSdkProvisioner(api_key=cfg.ELEVENLABS_API_KEY)
    raise ValueError(f"ELEVENLABS_PROVISIONER={cfg.ELEVENLABS_PROVISIONER} no soportado")


def _resolved_agent_id(settings: Settings) -> str:
    from infrastructure.external.elevenlabs.paths import resolve_repo_relative_path
    from infrastructure.external.elevenlabs.state_store import JsonStateStore

    if settings.ELEVENLABS_AGENT_ID:
        return settings.ELEVENLABS_AGENT_ID
    state_path = resolve_repo_relative_path(settings.ELEVENLABS_STATE_FILE)
    state = JsonStateStore(state_path).load()
    return state.agent_id if state else ""


def get_elevenlabs_conversation_client(settings: Settings | None = None):
    from infrastructure.external.elevenlabs.in_memory_conversation_client import (
        InMemoryConversationClient,
    )

    cfg = settings or get_settings()
    agent_id = _resolved_agent_id(cfg)
    if cfg.VOICE == "mock" or cfg.ELEVENLABS_PROVISIONER == "memory":
        return InMemoryConversationClient(clock=get_clock(cfg), agent_id=agent_id or "agent_mock_1")
    raise ValueError("Cliente de conversación ElevenLabs real no implementado en BE-09")


def get_connect_session_use_case(settings: Settings | None = None):
    from application.use_cases.voice.connect_session import ConnectSessionUseCase

    cfg = settings or get_settings()
    return ConnectSessionUseCase(
        sessions=get_session_repository(cfg),
        work_orders=get_work_order_repository(cfg),
        assets=get_asset_repository(cfg),
        conversation_client=get_elevenlabs_conversation_client(cfg),
        agent_id=_resolved_agent_id(cfg),
        connect_mode=cfg.ELEVENLABS_CONNECT_MODE,
    )


def get_provision_status_use_case(settings: Settings | None = None):
    from application.use_cases.elevenlabs.get_provision_status import GetProvisionStatusUseCase

    cfg = settings or get_settings()
    return GetProvisionStatusUseCase(settings=cfg)
