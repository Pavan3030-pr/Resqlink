package com.resqlink.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/** Housekeeping for the small shared-state tables. */
@Component
public class MaintenanceJobs {
    private static final Logger log = LoggerFactory.getLogger(MaintenanceJobs.class);
    private final JdbcTemplate jdbc;

    public MaintenanceJobs(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    @Scheduled(fixedDelay = 300_000, initialDelay = 60_000)
    public void purge() {
        try {
            int n = jdbc.update("DELETE FROM webhook_nonces WHERE expires_at < now()");
            int r = jdbc.update("DELETE FROM rate_limit_counters WHERE window_start < (extract(epoch from now())::bigint / 60) - 10");
            int i = jdbc.update("DELETE FROM idempotency_keys WHERE created_at < now() - interval '2 days'");
            if (n + r + i > 0) log.debug("Purged {} nonces, {} rate-limit rows, {} idempotency keys", n, r, i);
        } catch (RuntimeException e) {
            log.warn("Maintenance purge failed: {}", e.getClass().getSimpleName());
        }
    }
}
