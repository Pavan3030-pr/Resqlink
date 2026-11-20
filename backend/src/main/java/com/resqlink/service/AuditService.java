package com.resqlink.service;

import com.resqlink.core.AuditChain;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

/**
 * Append-only audit log with a SHA-256 hash chain: editing or deleting a past entry breaks every later hash,
 * which {@link #verify()} detects. Writers are serialised with a transaction-scoped advisory lock.
 */
@Service
public class AuditService {
    private static final long LOCK_KEY = 7001L;
    private final JdbcTemplate jdbc;

    public AuditService(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    @Transactional(propagation = Propagation.REQUIRED)
    public void log(Long userId, String action, String resourceType, Object resourceId, String details) {
        String d = details == null ? null : (details.length() > 400 ? details.substring(0, 400) : details);
        String rid = resourceId == null ? null : String.valueOf(resourceId);
        jdbc.query("SELECT pg_advisory_xact_lock(?)", rs -> { }, LOCK_KEY);
        String prev = jdbc.query("SELECT hash FROM audit_logs WHERE hash IS NOT NULL ORDER BY id DESC LIMIT 1",
                rs -> rs.next() ? rs.getString(1) : null);
        if (prev == null) prev = AuditChain.GENESIS;
        long ms = Instant.now().toEpochMilli();
        String hash = AuditChain.hash(prev, userId, action, resourceType, rid, d, ms);
        jdbc.update("INSERT INTO audit_logs(user_id, action, resource_type, resource_id, details, created_at, prev_hash, hash) "
                + "VALUES (?, ?, ?, ?, ?, ?, ?, ?)", userId, action, resourceType, rid, d, Timestamp.from(Instant.ofEpochMilli(ms)), prev, hash);
    }

    public record Verification(boolean valid, long checked, Long firstBrokenId) {}

    /** Recomputes the whole chain (entries written before hash chaining existed are skipped). */
    @Transactional(readOnly = true)
    public Verification verify() {
        List<Map<String, Object>> rows = jdbc.queryForList(
                "SELECT id, user_id, action, resource_type, resource_id, details, created_at, prev_hash, hash "
                        + "FROM audit_logs WHERE hash IS NOT NULL ORDER BY id");
        List<AuditChain.Entry> entries = new ArrayList<>(rows.size());
        for (Map<String, Object> r : rows) {
            entries.add(new AuditChain.Entry(((Number) r.get("id")).longValue(),
                    r.get("user_id") == null ? null : ((Number) r.get("user_id")).longValue(),
                    (String) r.get("action"), (String) r.get("resource_type"), (String) r.get("resource_id"),
                    (String) r.get("details"), ((Timestamp) r.get("created_at")).getTime(),
                    (String) r.get("prev_hash"), (String) r.get("hash")));
        }
        long broken = AuditChain.firstBroken(entries);
        return new Verification(broken < 0, entries.size(), broken < 0 ? null : broken);
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> forResource(String resourceType, String resourceId) {
        return jdbc.queryForList("SELECT user_id, action, details, created_at FROM audit_logs WHERE resource_type = ? AND resource_id = ? ORDER BY id",
                resourceType, resourceId);
    }
}
