package com.resqlink.core;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import java.util.List;

/** Tamper-evident audit log: each entry's hash covers its content and the previous entry's hash. */
public final class AuditChain {
    public static final String GENESIS = "0".repeat(64);

    private AuditChain() {}

    public record Entry(long id, Long userId, String action, String resourceType, String resourceId, String details,
                        long createdAtEpochMillis, String prevHash, String hash) {}

    public static String hash(String prevHash, Long userId, String action, String resourceType, String resourceId,
                              String details, long createdAtEpochMillis) {
        String canonical = String.join("\u001f", prevHash, String.valueOf(userId), nz(action), nz(resourceType),
                nz(resourceId), nz(details), String.valueOf(createdAtEpochMillis));
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(canonical.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }

    /** @return id of the first broken entry, or -1 when the chain is intact (entries in insertion order) */
    public static long firstBroken(List<Entry> entries) {
        String prev = GENESIS;
        for (Entry e : entries) {
            if (!prev.equals(e.prevHash())) return e.id();
            String expected = hash(e.prevHash(), e.userId(), e.action(), e.resourceType(), e.resourceId(), e.details(), e.createdAtEpochMillis());
            if (!expected.equals(e.hash())) return e.id();
            prev = e.hash();
        }
        return -1;
    }

    private static String nz(String s) { return s == null ? "" : s; }
}
