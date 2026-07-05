-- SUPERION — esquema operativo Postgres/Supabase
-- Ref: PRD §10, integration_contracts.md §6

CREATE TABLE IF NOT EXISTS plant (
    id          TEXT PRIMARY KEY,
    name        TEXT        NOT NULL,
    location    TEXT        NOT NULL DEFAULT '',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS app_user (
    id              TEXT PRIMARY KEY,
    email           TEXT        NOT NULL UNIQUE,
    password_hash   TEXT        NOT NULL,
    full_name       TEXT        NOT NULL,
    role            TEXT        NOT NULL,
    plant_id        TEXT        NOT NULL REFERENCES plant (id),
    is_blocked      BOOLEAN     NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS asset (
    id                  TEXT PRIMARY KEY,
    plant_id            TEXT        NOT NULL REFERENCES plant (id),
    tag                 TEXT        NOT NULL,
    name                TEXT        NOT NULL,
    model               TEXT        NOT NULL,
    manufacturer        TEXT        NOT NULL DEFAULT '',
    current_manual_id   TEXT
);

CREATE TABLE IF NOT EXISTS manual (
    id              TEXT PRIMARY KEY,
    title           TEXT        NOT NULL,
    asset_model     TEXT        NOT NULL,
    version         INTEGER     NOT NULL CHECK (version >= 1),
    status          TEXT        NOT NULL,
    index_status    TEXT        NOT NULL,
    storage_path    TEXT        NOT NULL,
    chunk_count     INTEGER     NOT NULL DEFAULT 0 CHECK (chunk_count >= 0),
    uploaded_at     TIMESTAMPTZ NOT NULL,
    uploaded_by_id  TEXT        NOT NULL,
    plant_id        TEXT        NOT NULL REFERENCES plant (id)
);

CREATE INDEX IF NOT EXISTS idx_manual_asset_model_status
    ON manual (asset_model, status, version DESC);

CREATE TABLE IF NOT EXISTS manual_chunk (
    id              TEXT PRIMARY KEY,
    manual_id       TEXT        NOT NULL REFERENCES manual (id) ON DELETE CASCADE,
    page            INTEGER     NOT NULL CHECK (page >= 1),
    section_path    TEXT        NOT NULL DEFAULT '',
    content         TEXT        NOT NULL,
    embedding       DOUBLE PRECISION[] NOT NULL,
    token_count     INTEGER     NOT NULL DEFAULT 0 CHECK (token_count >= 0)
);

CREATE INDEX IF NOT EXISTS idx_manual_chunk_manual_id ON manual_chunk (manual_id);

CREATE TABLE IF NOT EXISTS procedure_template (
    id                          TEXT PRIMARY KEY,
    name                        TEXT        NOT NULL,
    version                     TEXT        NOT NULL,
    manual_id                   TEXT        NOT NULL,
    steps                       JSONB       NOT NULL,
    critical_step_indices       INTEGER[]   NOT NULL DEFAULT '{}',
    photo_required_step_indices INTEGER[]   NOT NULL DEFAULT '{}',
    estimated_minutes           INTEGER     NOT NULL CHECK (estimated_minutes >= 0)
);

CREATE TABLE IF NOT EXISTS work_order (
    id                      TEXT PRIMARY KEY,
    code                    TEXT        NOT NULL,
    asset_id                TEXT        NOT NULL REFERENCES asset (id),
    type                    TEXT        NOT NULL,
    priority                TEXT        NOT NULL,
    status                  TEXT        NOT NULL,
    assigned_to             TEXT,
    planned_start           TIMESTAMPTZ NOT NULL,
    planned_end             TIMESTAMPTZ NOT NULL,
    procedure_template_id   TEXT        NOT NULL REFERENCES procedure_template (id),
    created_at              TIMESTAMPTZ NOT NULL,
    description             TEXT        NOT NULL DEFAULT '',
    notes                   TEXT        NOT NULL DEFAULT '',
    linked_wo_ids           TEXT[]      NOT NULL DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_work_order_assigned_created
    ON work_order (assigned_to, created_at, id);

CREATE TABLE IF NOT EXISTS maintenance_session (
    id                  TEXT PRIMARY KEY,
    work_order_id       TEXT        NOT NULL REFERENCES work_order (id),
    technician_id       TEXT        NOT NULL,
    status              TEXT        NOT NULL,
    started_at          TIMESTAMPTZ NOT NULL,
    ended_at            TIMESTAMPTZ,
    current_step_index  INTEGER     NOT NULL DEFAULT 0 CHECK (current_step_index >= 0),
    langgraph_thread_id TEXT        NOT NULL,
    metrics             JSONB       NOT NULL DEFAULT '{}'::jsonb
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_maintenance_session_active_wo
    ON maintenance_session (work_order_id)
    WHERE status IN ('active', 'paused');

CREATE TABLE IF NOT EXISTS session_event (
    id          TEXT        NOT NULL,
    session_id  TEXT        NOT NULL REFERENCES maintenance_session (id) ON DELETE CASCADE,
    seq         INTEGER     NOT NULL CHECK (seq >= 1),
    type        TEXT        NOT NULL,
    payload     JSONB       NOT NULL DEFAULT '{}'::jsonb,
    step_index  INTEGER     NOT NULL DEFAULT 0 CHECK (step_index >= 0),
    created_at  TIMESTAMPTZ NOT NULL,
    audio_ref   TEXT,
    transcript  TEXT,
    PRIMARY KEY (session_id, seq),
    CONSTRAINT session_event_event_id_unique UNIQUE (session_id, id)
);

CREATE INDEX IF NOT EXISTS idx_session_event_session_seq
    ON session_event (session_id, seq);

CREATE TABLE IF NOT EXISTS evidence_photo (
    id                  TEXT PRIMARY KEY,
    session_id          TEXT        NOT NULL REFERENCES maintenance_session (id) ON DELETE CASCADE,
    step_index          INTEGER     NOT NULL CHECK (step_index >= 0),
    storage_path        TEXT        NOT NULL,
    captured_at         TIMESTAMPTZ NOT NULL,
    validation_status   TEXT        NOT NULL,
    validation_feedback TEXT,
    retries             INTEGER     NOT NULL DEFAULT 0 CHECK (retries >= 0),
    model_version       TEXT,
    event_id            TEXT,
    criteria            TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_evidence_photo_session_event
    ON evidence_photo (session_id, event_id)
    WHERE event_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_evidence_photo_session
    ON evidence_photo (session_id);

CREATE TABLE IF NOT EXISTS maintenance_report (
    id                TEXT PRIMARY KEY,
    session_id        TEXT        NOT NULL UNIQUE REFERENCES maintenance_session (id) ON DELETE CASCADE,
    status            TEXT        NOT NULL,
    content_json      JSONB       NOT NULL DEFAULT '{}'::jsonb,
    version           INTEGER     NOT NULL CHECK (version >= 1),
    updated_at        TIMESTAMPTZ NOT NULL,
    pdf_storage_path  TEXT,
    sha256            TEXT,
    generated_at      TIMESTAMPTZ,
    finalized_at      TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS audit_log (
    id              TEXT PRIMARY KEY,
    actor_user_id   TEXT        NOT NULL,
    action          TEXT        NOT NULL,
    target_type     TEXT        NOT NULL,
    target_id       TEXT        NOT NULL,
    payload         JSONB       NOT NULL DEFAULT '{}'::jsonb,
    created_at      TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_audit_log_created ON audit_log (created_at, id);
