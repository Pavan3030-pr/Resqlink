package com.resqlink.core;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;

/**
 * Nexconn request/webhook signature helper.
 * Per the Nexconn server SDK, requests carry App-Key, Nonce, Timestamp (ms) and
 * Signature = lowercase hex SHA-1 of (AppSecret + Nonce + Timestamp).
 */
public final class NexconnSigner {
    private NexconnSigner() {}

    public static String sign(String appSecret, String nonce, String timestamp) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-1");
            byte[] digest = md.digest((appSecret + nonce + timestamp).getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }

    /** Nexconn timestamps are milliseconds; some integrations send seconds. Normalise either to milliseconds. */
    public static long toMillis(long timestamp) {
        return timestamp < 100_000_000_000L ? timestamp * 1000L : timestamp;
    }

    /** Constant-time signature comparison (no freshness check). */
    public static boolean signatureMatches(String appSecret, String nonce, String timestamp, String signature) {
        if (appSecret == null || appSecret.isBlank() || nonce == null || timestamp == null || signature == null) return false;
        String expected = sign(appSecret, nonce, timestamp);
        return MessageDigest.isEqual(expected.getBytes(StandardCharsets.UTF_8),
                signature.trim().toLowerCase().getBytes(StandardCharsets.UTF_8));
    }

    /**
     * Verifies a callback signature in constant time and rejects stale timestamps (replay protection).
     * @param maxSkewMillis maximum allowed difference between {@code nowMillis} and the timestamp
     */
    public static boolean verify(String appSecret, String nonce, String timestamp, String signature,
                                 long nowMillis, long maxSkewMillis) {
        if (appSecret == null || appSecret.isBlank() || nonce == null || timestamp == null || signature == null) return false;
        long ts;
        try {
            ts = toMillis(Long.parseLong(timestamp.trim()));
        } catch (NumberFormatException e) {
            return false;
        }
        if (Math.abs(nowMillis - ts) > maxSkewMillis) return false;
        return signatureMatches(appSecret, nonce, timestamp.trim(), signature);
    }
}
