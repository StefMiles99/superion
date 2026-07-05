"""Use case ReadinessCheck — BE-08."""

from __future__ import annotations

from infrastructure.config import Settings


class ReadinessCheck:
    """Verifica que las dependencias configuradas estén listas."""

    def __init__(self, *, settings: Settings) -> None:
        self._settings = settings

    async def execute(self) -> tuple[bool, dict[str, str]]:
        checks: dict[str, str] = {}
        all_ok = True

        if self._settings.AUTH == "supabase_auth":
            ok = bool(self._settings.DATABASE_URL)
            checks["auth"] = "ok" if ok else "missing DATABASE_URL"
            all_ok = all_ok and ok

        if self._settings.PERSISTENCE == "supabase":
            ok = bool(self._settings.DATABASE_URL)
            checks["persistence"] = "ok" if ok else "missing DATABASE_URL"
            all_ok = all_ok and ok

        if self._settings.AUDIT_LOG == "supabase":
            ok = bool(self._settings.DATABASE_URL)
            checks["audit_log"] = "ok" if ok else "missing DATABASE_URL"
            all_ok = all_ok and ok

        if self._settings.STORAGE == "supabase":
            ok = bool(
                self._settings.SUPABASE_URL and self._settings.SUPABASE_SERVICE_ROLE_KEY
            )
            checks["storage"] = (
                "ok" if ok else "missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY"
            )
            all_ok = all_ok and ok

        if self._settings.LLM == "openrouter":
            ok = bool(self._settings.OPENROUTER_API_KEY)
            checks["llm"] = "ok" if ok else "missing OPENROUTER_API_KEY"
            all_ok = all_ok and ok

        if self._settings.EMBEDDING == "openrouter":
            ok = bool(self._settings.OPENROUTER_API_KEY)
            checks["embedding"] = "ok" if ok else "missing OPENROUTER_API_KEY"
            all_ok = all_ok and ok

        if self._settings.RERANKER == "openrouter":
            ok = bool(self._settings.OPENROUTER_API_KEY)
            checks["reranker"] = "ok" if ok else "missing OPENROUTER_API_KEY"
            all_ok = all_ok and ok

        if self._settings.PHOTO_VALIDATOR == "openrouter_vlm":
            ok = bool(self._settings.OPENROUTER_API_KEY)
            checks["photo_validator"] = "ok" if ok else "missing OPENROUTER_API_KEY"
            all_ok = all_ok and ok

        if self._settings.INTENT_CLASSIFIER == "llm":
            ok = bool(self._settings.OPENROUTER_API_KEY)
            checks["intent_classifier"] = "ok" if ok else "missing OPENROUTER_API_KEY"
            all_ok = all_ok and ok

        if self._settings.EVENTBUS == "redis":
            ok = bool(self._settings.REDIS_URL)
            checks["eventbus"] = "ok" if ok else "missing REDIS_URL"
            all_ok = all_ok and ok

        if self._settings.PDF == "weasyprint":
            checks["pdf"] = "ok"

        if self._settings.VOICE == "elevenlabs":
            ok = bool(self._settings.ELEVENLABS_API_KEY)
            checks["voice"] = "ok" if ok else "missing ELEVENLABS_API_KEY"
            all_ok = all_ok and ok
            agent_id = self._settings.ELEVENLABS_AGENT_ID
            if not agent_id:
                from infrastructure.external.elevenlabs.paths import resolve_repo_relative_path
                from infrastructure.external.elevenlabs.state_store import JsonStateStore

                state = JsonStateStore(
                    resolve_repo_relative_path(self._settings.ELEVENLABS_STATE_FILE)
                ).load()
                agent_id = state.agent_id if state else ""
            agent_ok = bool(agent_id)
            checks["elevenlabs_agent"] = "ok" if agent_ok else "not_configured"
            all_ok = all_ok and agent_ok

        if self._settings.LANGGRAPH == "langgraph":
            ok = bool(self._settings.LANGGRAPH_URL)
            checks["langgraph"] = "ok" if ok else "missing LANGGRAPH_URL"
            all_ok = all_ok and ok

        if not checks:
            checks["mode"] = "memory/mock — all deps in-process"

        return all_ok, checks
