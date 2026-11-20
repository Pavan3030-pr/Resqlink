-- ResQLink schema. PostGIS is used for geographic indexing and proximity queries.
CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TABLE users (
    id                  BIGSERIAL PRIMARY KEY,
    full_name           VARCHAR(120) NOT NULL,
    email               VARCHAR(190) NOT NULL UNIQUE,
    password_hash       VARCHAR(100) NOT NULL,
    phone               VARCHAR(30),
    role                VARCHAR(20)  NOT NULL CHECK (role IN ('CITIZEN','DISPATCHER','RESPONDER','ADMIN')),
    verification_status VARCHAR(20)  NOT NULL DEFAULT 'VERIFIED' CHECK (verification_status IN ('PENDING','VERIFIED','REJECTED')),
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE TABLE responder_profiles (
    id                  BIGSERIAL PRIMARY KEY,
    user_id             BIGINT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    responder_type      VARCHAR(30) NOT NULL DEFAULT 'GENERAL',
    availability_status VARCHAR(20) NOT NULL DEFAULT 'OFFLINE' CHECK (availability_status IN ('AVAILABLE','BUSY','OFFLINE')),
    share_location      BOOLEAN NOT NULL DEFAULT FALSE,
    last_latitude       DOUBLE PRECISION,
    last_longitude      DOUBLE PRECISION,
    last_location_at    TIMESTAMPTZ
);

CREATE SEQUENCE incident_number_seq START WITH 1001 INCREMENT BY 1;

CREATE TABLE incidents (
    id                BIGSERIAL PRIMARY KEY,
    incident_number   VARCHAR(20) NOT NULL UNIQUE,
    reported_by       BIGINT NOT NULL REFERENCES users(id),
    category          VARCHAR(20) NOT NULL CHECK (category IN ('ACCIDENT','FIRE','FLOOD','MEDICAL','OTHER')),
    description       TEXT NOT NULL,
    image_url         VARCHAR(300),
    latitude          DOUBLE PRECISION NOT NULL CHECK (latitude BETWEEN -90 AND 90),
    longitude         DOUBLE PRECISION NOT NULL CHECK (longitude BETWEEN -180 AND 180),
    location          geography(Point, 4326),
    address_hint      VARCHAR(250),
    contact_name      VARCHAR(120),
    contact_phone     VARCHAR(30),
    incident_time     TIMESTAMPTZ NOT NULL,
    priority          VARCHAR(10) CHECK (priority IN ('CRITICAL','HIGH','MEDIUM','LOW')),
    status            VARCHAR(30) NOT NULL,
    ai_summary        TEXT,
    verified_by       BIGINT REFERENCES users(id),
    duplicate_of_id   BIGINT REFERENCES incidents(id),
    version           BIGINT NOT NULL DEFAULT 0,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Keep the PostGIS point in sync with latitude/longitude.
CREATE FUNCTION incidents_set_location() RETURNS trigger AS $$
BEGIN
    NEW.location := ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326)::geography;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_incidents_location
    BEFORE INSERT OR UPDATE OF latitude, longitude ON incidents
    FOR EACH ROW EXECUTE FUNCTION incidents_set_location();

CREATE INDEX idx_incidents_location ON incidents USING GIST (location);
CREATE INDEX idx_incidents_status ON incidents (status);
CREATE INDEX idx_incidents_priority ON incidents (priority);
CREATE INDEX idx_incidents_created ON incidents (created_at DESC);
CREATE INDEX idx_incidents_reporter ON incidents (reported_by);

CREATE TABLE incident_assignments (
    id                BIGSERIAL PRIMARY KEY,
    incident_id       BIGINT NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
    responder_id      BIGINT NOT NULL REFERENCES users(id),
    assigned_by       BIGINT NOT NULL REFERENCES users(id),
    assignment_status VARCHAR(20) NOT NULL CHECK (assignment_status IN ('ASSIGNED','ACCEPTED','DECLINED','ARRIVED','COMPLETED','CANCELLED')),
    decline_reason    VARCHAR(300),
    assigned_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    accepted_at       TIMESTAMPTZ,
    arrived_at        TIMESTAMPTZ,
    completed_at      TIMESTAMPTZ
);
-- A responder can hold only one live assignment per incident (duplicate assignment protection).
CREATE UNIQUE INDEX uq_assignment_live ON incident_assignments (incident_id, responder_id)
    WHERE assignment_status IN ('ASSIGNED','ACCEPTED','ARRIVED');
CREATE INDEX idx_assignment_responder ON incident_assignments (responder_id, assignment_status);

CREATE TABLE incident_channels (
    id               BIGSERIAL PRIMARY KEY,
    incident_id      BIGINT NOT NULL UNIQUE REFERENCES incidents(id) ON DELETE CASCADE,
    nexconn_channel_id VARCHAR(100) NOT NULL UNIQUE,
    channel_type     VARCHAR(20) NOT NULL DEFAULT 'GROUP',
    reporter_invited BOOLEAN NOT NULL DEFAULT FALSE,
    last_message_at  TIMESTAMPTZ,
    message_count    BIGINT NOT NULL DEFAULT 0,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE incident_ai_analyses (
    id                    BIGSERIAL PRIMARY KEY,
    incident_id           BIGINT NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
    suggested_category    VARCHAR(20) NOT NULL,
    suggested_priority    VARCHAR(10) NOT NULL,
    confidence            DOUBLE PRECISION NOT NULL,
    summary               TEXT NOT NULL,
    key_information       JSONB NOT NULL DEFAULT '[]'::jsonb,
    missing_information   JSONB NOT NULL DEFAULT '[]'::jsonb,
    extracted_location    VARCHAR(250),
    model_version         VARCHAR(80) NOT NULL,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_analysis_incident ON incident_ai_analyses (incident_id, created_at DESC);

CREATE TABLE incident_status_history (
    id              BIGSERIAL PRIMARY KEY,
    incident_id     BIGINT NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
    previous_status VARCHAR(30),
    new_status      VARCHAR(30) NOT NULL,
    changed_by      BIGINT REFERENCES users(id),
    reason          VARCHAR(400),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_history_incident ON incident_status_history (incident_id, created_at);

CREATE TABLE notifications (
    id                BIGSERIAL PRIMARY KEY,
    user_id           BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    incident_id       BIGINT REFERENCES incidents(id) ON DELETE CASCADE,
    notification_type VARCHAR(40) NOT NULL,
    title             VARCHAR(160) NOT NULL,
    message           VARCHAR(400) NOT NULL,
    delivery_status   VARCHAR(20) NOT NULL DEFAULT 'DELIVERED',
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    read_at           TIMESTAMPTZ
);
CREATE INDEX idx_notifications_user ON notifications (user_id, created_at DESC);

CREATE TABLE audit_logs (
    id            BIGSERIAL PRIMARY KEY,
    user_id       BIGINT REFERENCES users(id) ON DELETE SET NULL,
    action        VARCHAR(60) NOT NULL,
    resource_type VARCHAR(40) NOT NULL,
    resource_id   VARCHAR(60),
    details       VARCHAR(400),
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_audit_created ON audit_logs (created_at DESC);
