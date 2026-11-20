-- Security hardening, resilient chat sync, AI observability, location quality and demo support.

-- Accounts: suspension, session revocation (token_version) and brute-force lockout.
ALTER TABLE users
    ADD COLUMN status         VARCHAR(12) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','SUSPENDED')),
    ADD COLUMN token_version  INTEGER     NOT NULL DEFAULT 0,
    ADD COLUMN failed_logins  INTEGER     NOT NULL DEFAULT 0,
    ADD COLUMN locked_until   TIMESTAMPTZ;

-- Webhook replay protection: single-use nonces shared by every backend instance.
CREATE TABLE webhook_nonces (
    nonce      VARCHAR(128) PRIMARY KEY,
    expires_at TIMESTAMPTZ  NOT NULL
);
CREATE INDEX idx_webhook_nonces_expiry ON webhook_nonces (expires_at);

-- Distributed fixed-window rate limiting.
CREATE TABLE rate_limit_counters (
    bucket       VARCHAR(160) NOT NULL,
    window_start BIGINT       NOT NULL,
    hits         INTEGER      NOT NULL,
    PRIMARY KEY (bucket, window_start)
);

-- Idempotent POSTs (Idempotency-Key header).
CREATE TABLE idempotency_keys (
    id            BIGSERIAL PRIMARY KEY,
    user_id       BIGINT       NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    scope         VARCHAR(40)  NOT NULL,
    key_hash      VARCHAR(64)  NOT NULL,
    status        VARCHAR(12)  NOT NULL CHECK (status IN ('IN_PROGRESS','DONE')),
    response_json TEXT,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
    UNIQUE (user_id, scope, key_hash)
);
CREATE INDEX idx_idempotency_created ON idempotency_keys (created_at);

-- Tamper-evident audit log (hash chain).
ALTER TABLE audit_logs
    ADD COLUMN prev_hash VARCHAR(64),
    ADD COLUMN hash      VARCHAR(64);

-- Chat channel synchronisation state, so a failed Nexconn call never corrupts an assignment and can be retried.
ALTER TABLE incident_channels
    ADD COLUMN sync_status     VARCHAR(10) NOT NULL DEFAULT 'SYNCED' CHECK (sync_status IN ('PENDING','SYNCED','FAILED')),
    ADD COLUMN sync_attempts   INTEGER     NOT NULL DEFAULT 0,
    ADD COLUMN last_sync_error VARCHAR(300),
    ADD COLUMN last_synced_at  TIMESTAMPTZ,
    ADD COLUMN next_retry_at   TIMESTAMPTZ;

-- AI observability: status, latency, fallback reason and prompt-safety signals.
ALTER TABLE incident_ai_analyses
    ADD COLUMN processing_status    VARCHAR(12) NOT NULL DEFAULT 'OK' CHECK (processing_status IN ('OK','FALLBACK')),
    ADD COLUMN latency_ms           BIGINT,
    ADD COLUMN fallback_reason      VARCHAR(200),
    ADD COLUMN suspected_injection  BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN redacted             BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN input_chars          INTEGER,
    ADD COLUMN output_chars         INTEGER;

-- Location quality and demo labelling.
ALTER TABLE incidents
    ADD COLUMN location_accuracy_m INTEGER,
    ADD COLUMN location_source     VARCHAR(10) CHECK (location_source IN ('GPS','MAP_PIN')),
    ADD COLUMN demo                BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX idx_incidents_updated ON incidents (updated_at DESC);
CREATE INDEX idx_assignments_incident_status ON incident_assignments (incident_id, assignment_status);
