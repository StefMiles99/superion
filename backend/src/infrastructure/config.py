"""Configuración por entorno — BE-00/BE-01."""

from __future__ import annotations

from typing import Literal

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Settings cargadas desde variables de entorno y `.env`."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    APP_ENV: Literal["dev", "prod"] = "dev"
    LOG_LEVEL: Literal["DEBUG", "INFO", "WARNING", "ERROR"] = "INFO"
    APP_VERSION: str = "0.1.0"
    CLOCK_MODE: Literal["real", "memory"] = "real"
    PERSISTENCE: Literal["memory", "supabase"] = "memory"
    LLM: Literal["mock", "openrouter"] = "mock"
    VOICE: Literal["mock", "elevenlabs"] = "mock"
    VECTOR_STORE: Literal["memory", "pgvector"] = "memory"
    STORAGE: Literal["memory", "supabase"] = "memory"
    PDF: Literal["mock", "weasyprint"] = "mock"
    REPORT_BUILDER: Literal["memory", "langgraph"] = "memory"
    AUTH: Literal["memory", "supabase_auth"] = "memory"
    API_BASE_URL: str = "http://localhost:8000"
    PHOTO_VALIDATOR: Literal["mock", "openrouter_vlm"] = "mock"
    PHOTO_MAX_SIZE_MB: int = 10
    PHOTO_MAX_RETRIES: int = 3
    SIGNED_URL_TTL_SECONDS: int = 900
    JWT_SECRET: str = Field(default="change-me-32-bytes-minimum-secret-key")
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_TTL_SECONDS: int = 3600
    REFRESH_TOKEN_TTL_SECONDS: int = 2592000
    PASSWORD_BCRYPT_ROUNDS: int = 10
    WS_HEARTBEAT_INTERVAL: int = 30
    WS_PONG_TIMEOUT: int = 60
    WS_REPLAY_ON_CONNECT: bool = True
    EVENTBUS: Literal["memory", "redis"] = "memory"
    EMBEDDING: Literal["mock", "openrouter"] = "mock"
    EMBEDDING_DIM: int = 384
    RERANKER: Literal["mock", "openrouter"] = "mock"
    CHUNK_SIZE: int = 512
    CHUNK_OVERLAP: int = 64
    RAG_TOP_K: int = 8
    RAG_TOP_N: int = 3
    RAG_ABSTAIN_THRESHOLD: float = 0.3
    MANUAL_MAX_SIZE_MB: int = 50
    MANUAL_INDEX_ESTIMATED_SECONDS: int = 90
    INTENT_CLASSIFIER: Literal["mock", "llm"] = "mock"
    LANGGRAPH: Literal["mock", "langgraph"] = "mock"
    ELEVENLABS_WEBHOOK_SECRET: str = "change-me"
    ELEVENLABS_SIGNATURE_WINDOW_SECONDS: int = 300

    # Observabilidad y hardening — BE-08
    METRICS: Literal["memory", "prometheus"] = "memory"
    RATE_LIMIT_PER_MIN: int = 60
    RATE_LIMIT_ENABLED: bool = True
    AUDIT_LOG: Literal["memory", "supabase"] = "memory"
    SECURITY_HEADERS: bool = True

    # Dependencias externas (ready check cuando mode != memory/mock)
    SUPABASE_URL: str = ""
    SUPABASE_SERVICE_ROLE_KEY: str = ""
    OPENROUTER_API_KEY: str = ""
    ELEVENLABS_API_KEY: str = ""
    LANGGRAPH_URL: str = ""

    # ElevenLabs provision — BE-09
    ELEVENLABS_PROVISIONER: Literal["memory", "api"] = "memory"
    ELEVENLABS_AGENT_MANIFEST: str = "elevenlabs/agent.yaml"
    ELEVENLABS_STATE_FILE: str = "elevenlabs/state.json"
    ELEVENLABS_AGENT_ID: str = ""
    ELEVENLABS_VOICE_ID: str = "JBFqnCBsd6RMkjVDRZzb"
    ELEVENLABS_CONNECT_MODE: Literal["signed_url", "webrtc"] = "signed_url"
    DEPLOY_ENV: str = "dev"
