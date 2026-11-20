package com.resqlink.security;

import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

/**
 * Fixed-window rate limiter shared by all backend instances through PostgreSQL (atomic upsert).
 * If the database is briefly unavailable it degrades to a per-instance in-memory counter instead of failing open.
 */
@Component
public class RateLimiter {
    private static final Logger log = LoggerFactory.getLogger(RateLimiter.class);

    private record Local(long window, int hits) {}

    private final JdbcTemplate jdbc;
    private final Map<String, Local> local = new ConcurrentHashMap<>();

    public RateLimiter(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    /** @return true when the call is within the limit */
    public boolean allow(String bucket, int limit, int windowSeconds) {
        long window = Instant.now().getEpochSecond() / windowSeconds;
        String key = bucket.length() > 150 ? bucket.substring(0, 150) : bucket;
        try {
            Integer hits = jdbc.queryForObject(
                    "INSERT INTO rate_limit_counters(bucket, window_start, hits) VALUES (?, ?, 1) "
                            + "ON CONFLICT (bucket, window_start) DO UPDATE SET hits = rate_limit_counters.hits + 1 RETURNING hits",
                    Integer.class, key, window);
            return hits != null && hits <= limit;
        } catch (RuntimeException e) {
            log.warn("Rate-limit store unavailable, using local counter: {}", e.getClass().getSimpleName());
            Local l = local.merge(key, new Local(window, 1), (o, f) -> o.window() == window ? new Local(window, o.hits() + 1) : f);
            if (local.size() > 5_000) local.entrySet().removeIf(en -> en.getValue().window() < window);
            return l.hits() <= limit;
        }
    }

    public void purgeOld(int keepWindowsSeconds) {
        jdbc.update("DELETE FROM rate_limit_counters WHERE window_start < ?", Instant.now().getEpochSecond() / 60 - keepWindowsSeconds / 60 - 5);
    }
}
