"""Tests de carga de Settings — BE-00."""

import pytest

from infrastructure.config import Settings


def test_settings_defaults() -> None:
    settings = Settings()
    assert settings.APP_ENV == "dev"
    assert settings.LOG_LEVEL == "INFO"
    assert settings.APP_VERSION == "0.1.0"
    assert settings.PERSISTENCE == "memory"
    assert settings.LLM == "mock"
    assert settings.VOICE == "mock"
    assert settings.VECTOR_STORE == "memory"
    assert settings.STORAGE == "memory"
    assert settings.PDF == "mock"
    assert settings.AUTH == "memory"
    assert settings.CLOCK_MODE == "real"


def test_settings_from_env(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("APP_ENV", "prod")
    monkeypatch.setenv("LOG_LEVEL", "DEBUG")
    monkeypatch.setenv("PERSISTENCE", "supabase")
    settings = Settings()
    assert settings.APP_ENV == "prod"
    assert settings.LOG_LEVEL == "DEBUG"
    assert settings.PERSISTENCE == "supabase"
