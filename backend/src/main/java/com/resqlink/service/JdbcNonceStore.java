package com.resqlink.service;

import com.resqlink.core.NonceStore;
import java.sql.Timestamp;
import java.time.Instant;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

/** PostgreSQL-backed single-use nonce store: one atomic statement decides first use versus replay. */
@Component
public class JdbcNonceStore implements NonceStore {
    private final JdbcTemplate jdbc;

    public JdbcNonceStore(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    @Override
    public boolean markIfNew(String nonce, Instant expiresAt, Instant now) {
        // Inserts, or re-claims the nonce only if its earlier record has already expired. Zero rows = replay.
        int rows = jdbc.update("INSERT INTO webhook_nonces(nonce, expires_at) VALUES (?, ?) "
                + "ON CONFLICT (nonce) DO UPDATE SET expires_at = EXCLUDED.expires_at WHERE webhook_nonces.expires_at < ?",
                nonce, Timestamp.from(expiresAt), Timestamp.from(now));
        return rows == 1;
    }
}
