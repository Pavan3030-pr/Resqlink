package com.resqlink.service.nexconn;

import com.resqlink.config.AppProperties;
import com.resqlink.core.NexconnSigner;
import com.resqlink.error.ApiException;
import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

/**
 * Server-side client for the Nexconn Chat server API (signed requests; App Secret never leaves the backend).
 * Endpoints: /v4/auth/access-token/issue, /v4/group-channel/create|join|leave.
 */
@Component
public class NexconnClient {
    private static final Logger log = LoggerFactory.getLogger(NexconnClient.class);

    private final AppProperties.Nexconn cfg;
    private final RestClient http;

    public NexconnClient(AppProperties props) {
        this.cfg = props.nexconn();
        SimpleClientHttpRequestFactory f = new SimpleClientHttpRequestFactory();
        f.setConnectTimeout(Duration.ofSeconds(5));
        f.setReadTimeout(Duration.ofSeconds(10));
        String base = cfg.apiDomain() == null ? "" : cfg.apiDomain().trim();
        if (!base.isEmpty() && !base.startsWith("http")) base = "https://" + base;
        this.http = RestClient.builder().requestFactory(f).baseUrl(base).build();
    }

    public boolean configured() { return cfg.configured(); }

    public String appKey() { return cfg.appKey(); }

    /** Registers (or re-fetches) a user and returns the connection token. */
    public String issueAccessToken(String userId, String name) {
        Map<String, Object> res = post("/v4/auth/access-token/issue", Map.of("userId", userId, "name", name), false);
        Object result = res.get("result");
        if (result instanceof Map<?, ?> m && m.get("accessToken") instanceof String t && !t.isBlank()) return t;
        log.warn("Nexconn token response missing accessToken: code={}", res.get("code"));
        throw ApiException.unavailable("Chat service did not return an access token");
    }

    /** Creates a group channel; an already-existing channel (HTTP 409) is treated as success. */
    public void createGroup(String channelId, String name, String ownerUserId, List<String> memberUserIds) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("channelId", channelId);
        body.put("name", name);
        body.put("owner", ownerUserId);
        body.put("userIds", memberUserIds);
        post("/v4/group-channel/create", body, true);
    }

    public void joinGroup(String channelId, List<String> userIds) {
        if (userIds.isEmpty()) return;
        post("/v4/group-channel/join", Map.of("channelId", channelId, "userIds", userIds), true);
    }

    public void leaveGroup(String channelId, List<String> userIds) {
        if (userIds.isEmpty()) return;
        post("/v4/group-channel/leave", Map.of("channelId", channelId, "userIds", userIds), false);
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> post(String path, Object body, boolean conflictIsOk) {
        if (!cfg.configured()) throw ApiException.unavailable("Chat service is not configured on the server");
        RuntimeException last = null;
        for (int attempt = 1; attempt <= 3; attempt++) {
            String nonce = UUID.randomUUID().toString().replace("-", "");
            String ts = String.valueOf(System.currentTimeMillis());
            try {
                Map<String, Object> res = http.post().uri(path)
                        .header("App-Key", cfg.appKey())
                        .header("Nonce", nonce)
                        .header("Timestamp", ts)
                        .header("Signature", NexconnSigner.sign(cfg.appSecret(), nonce, ts))
                        .header("X-Request-ID", UUID.randomUUID().toString())
                        .contentType(MediaType.APPLICATION_JSON)
                        .body(body)
                        .retrieve()
                        .body(Map.class);
                return res == null ? Map.of() : res;
            } catch (HttpClientErrorException e) {
                if (conflictIsOk && e.getStatusCode() == HttpStatus.CONFLICT) return Map.of();
                log.warn("Nexconn {} rejected ({}): {}", path, e.getStatusCode(), e.getResponseBodyAsString());
                throw ApiException.unavailable("Chat service rejected the request (" + e.getStatusCode().value() + ")");
            } catch (RestClientException e) {
                last = e; // 5xx or I/O: retry with a fresh nonce
                log.warn("Nexconn {} attempt {} failed: {}", path, attempt, e.toString());
                try { Thread.sleep(200L * attempt); } catch (InterruptedException ie) { Thread.currentThread().interrupt(); break; }
            }
        }
        throw ApiException.unavailable("Chat service is temporarily unavailable" + (last == null ? "" : ""));
    }
}
