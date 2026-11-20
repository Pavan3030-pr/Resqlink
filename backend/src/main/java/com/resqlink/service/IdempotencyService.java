package com.resqlink.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.resqlink.error.ApiException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.HexFormat;
import java.util.Map;
import java.util.function.Supplier;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

/**
 * Makes critical POSTs safe to retry (mobile network loss, double taps, the offline queue). The first request with a
 * given Idempotency-Key runs; repeats return the stored response instead of creating a second incident or assignment.
 */
@Service
public class IdempotencyService {
    private final JdbcTemplate jdbc;
    private final ObjectMapper mapper;

    public IdempotencyService(JdbcTemplate jdbc, ObjectMapper mapper) {
        this.jdbc = jdbc;
        this.mapper = mapper;
    }

    public <T> T execute(long userId, String scope, String key, Class<T> type, Supplier<T> action) {
        if (key == null || key.isBlank()) return action.get();
        if (key.length() > 100 || !key.matches("[A-Za-z0-9._:-]+")) throw ApiException.badRequest("Invalid Idempotency-Key header");
        String hash = sha256(key);
        for (int attempt = 0; attempt < 2; attempt++) {
            int inserted = jdbc.update("INSERT INTO idempotency_keys(user_id, scope, key_hash, status) VALUES (?, ?, ?, 'IN_PROGRESS') "
                    + "ON CONFLICT (user_id, scope, key_hash) DO NOTHING", userId, scope, hash);
            if (inserted == 1) return runAndStore(userId, scope, hash, type, action);
            Map<String, Object> row = jdbc.queryForMap("SELECT status, response_json, (created_at < now() - interval '2 minutes') AS stale "
                    + "FROM idempotency_keys WHERE user_id = ? AND scope = ? AND key_hash = ?", userId, scope, hash);
            if ("DONE".equals(row.get("status"))) {
                try {
                    return mapper.readValue((String) row.get("response_json"), type);
                } catch (Exception e) {
                    throw ApiException.conflict("This request was already processed");
                }
            }
            if (Boolean.TRUE.equals(row.get("stale"))) { // an earlier attempt died mid-flight: release it and run again
                jdbc.update("DELETE FROM idempotency_keys WHERE user_id = ? AND scope = ? AND key_hash = ? AND status = 'IN_PROGRESS'", userId, scope, hash);
                continue;
            }
            throw ApiException.conflict("A request with this Idempotency-Key is still being processed");
        }
        throw ApiException.conflict("Could not process the request, please retry");
    }

    private <T> T runAndStore(long userId, String scope, String hash, Class<T> type, Supplier<T> action) {
        try {
            T result = action.get();
            String json;
            try {
                json = mapper.writeValueAsString(result);
            } catch (Exception e) {
                json = null;
            }
            jdbc.update("UPDATE idempotency_keys SET status = 'DONE', response_json = ? WHERE user_id = ? AND scope = ? AND key_hash = ?", json, userId, scope, hash);
            return result;
        } catch (RuntimeException e) {
            jdbc.update("DELETE FROM idempotency_keys WHERE user_id = ? AND scope = ? AND key_hash = ?", userId, scope, hash); // failed: allow a retry
            throw e;
        }
    }

    private static String sha256(String s) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(s.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
    }
}
