package com.resqlink.core;

import java.time.Instant;

/** Atomic, expiring "seen before" store. Production uses PostgreSQL so it is shared by every backend instance. */
public interface NonceStore {
    /**
     * Records the nonce if it has not been seen (or its earlier record expired as of {@code now}).
     * @return true for the first use, false for a replay. Must be atomic across concurrent callers.
     */
    boolean markIfNew(String nonce, Instant expiresAt, Instant now);
}
