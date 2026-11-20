package com.resqlink.core;

import java.time.Duration;
import java.time.Instant;

/**
 * Verifies Nexconn webhook authenticity: signature, freshness window and single-use nonce.
 * Nexconn signs SHA-1(AppSecret + Nonce + Timestamp), which does not cover the body, so every defence here
 * (time window, single-use nonce, HTTPS) matters and the handler must never trust the body for privileged actions.
 */
public final class WebhookVerifier {
    public enum Result { OK, MALFORMED, BAD_SIGNATURE, STALE, REPLAY }

    private final String appSecret;
    private final long maxSkewMillis;
    private final NonceStore nonces;

    public WebhookVerifier(String appSecret, Duration maxSkew, NonceStore nonces) {
        this.appSecret = appSecret;
        this.maxSkewMillis = maxSkew.toMillis();
        this.nonces = nonces;
    }

    public Result verify(String nonce, String timestamp, String signature, Instant now) {
        if (appSecret == null || appSecret.isBlank() || nonce == null || nonce.isBlank() || nonce.length() > 128
                || timestamp == null || signature == null || signature.isBlank()) return Result.MALFORMED;
        long ts;
        try {
            ts = NexconnSigner.toMillis(Long.parseLong(timestamp.trim()));
        } catch (NumberFormatException e) {
            return Result.MALFORMED;
        }
        // Signature first: unauthenticated callers must not be able to burn nonces or probe the freshness window.
        if (!NexconnSigner.signatureMatches(appSecret, nonce, timestamp.trim(), signature)) return Result.BAD_SIGNATURE;
        if (Math.abs(now.toEpochMilli() - ts) > maxSkewMillis) return Result.STALE;
        // Keep the nonce at least as long as the request could still pass the freshness check.
        Instant expires = Instant.ofEpochMilli(ts).plusMillis(maxSkewMillis).plusSeconds(60);
        return nonces.markIfNew(nonce, expires.isAfter(now) ? expires : now.plusSeconds(60), now) ? Result.OK : Result.REPLAY;
    }
}
