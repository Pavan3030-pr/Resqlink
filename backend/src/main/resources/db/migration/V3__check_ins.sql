-- Peer-support check-ins: people tell their community "I'm OK" on a rhythm they choose;
-- volunteers and dispatchers see who is overdue or asked for help and record that they followed up.

CREATE TABLE check_ins (
    id             BIGSERIAL PRIMARY KEY,
    user_id        BIGINT      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status         VARCHAR(12) NOT NULL CHECK (status IN ('OK','NEED_HELP')),
    note           VARCHAR(280),
    interval_hours INTEGER     NOT NULL CHECK (interval_hours BETWEEN 1 AND 72),
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_check_ins_user_time ON check_ins (user_id, created_at DESC);

CREATE TABLE check_in_follow_ups (
    id          BIGSERIAL PRIMARY KEY,
    user_id     BIGINT      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    by_user_id  BIGINT      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    note        VARCHAR(280),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_check_in_follow_ups_user_time ON check_in_follow_ups (user_id, created_at DESC);
