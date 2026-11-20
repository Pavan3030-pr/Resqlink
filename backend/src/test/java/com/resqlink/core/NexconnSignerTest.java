package com.resqlink.core;

import static org.junit.jupiter.api.Assertions.*;

import org.junit.jupiter.api.Test;

class NexconnSignerTest {
    @Test
    void signatureIsSha1HexOfSecretNonceTimestamp() {
        // sha1("secret" + "nonce" + "1700000000000")
        String sig = NexconnSigner.sign("secret", "nonce", "1700000000000");
        assertEquals(40, sig.length());
        assertEquals(sig, NexconnSigner.sign("secret", "nonce", "1700000000000"));
        assertNotEquals(sig, NexconnSigner.sign("secret2", "nonce", "1700000000000"));
    }

    @Test
    void knownSha1Vector() {
        // SHA-1("abc") = a9993e364706816aba3e25717850c26c9cd0d89d  (secret="a", nonce="b", ts="c")
        assertEquals("a9993e364706816aba3e25717850c26c9cd0d89d", NexconnSigner.sign("a", "b", "c"));
    }

    @Test
    void verifyAcceptsValidAndRejectsTamperedOrStale() {
        long now = 1_700_000_100_000L;
        String ts = "1700000000000";
        String good = NexconnSigner.sign("s3cret", "n1", ts);
        assertTrue(NexconnSigner.verify("s3cret", "n1", ts, good, now, 300_000L));
        assertFalse(NexconnSigner.verify("s3cret", "n1", ts, good.replace(good.charAt(0), good.charAt(0) == 'a' ? 'b' : 'a'), now, 300_000L));
        assertFalse(NexconnSigner.verify("wrong", "n1", ts, good, now, 300_000L));
        assertFalse(NexconnSigner.verify("s3cret", "n1", ts, good, now + 10_000_000L, 300_000L), "stale timestamp");
        assertFalse(NexconnSigner.verify("", "n1", ts, good, now, 300_000L));
        assertFalse(NexconnSigner.verify("s3cret", "n1", "abc", good, now, 300_000L));
        assertFalse(NexconnSigner.verify("s3cret", null, ts, good, now, 300_000L));
    }

    @Test
    void incidentNumbersAndChannels() {
        assertEquals("RL-1001", IncidentNumbers.format(1001));
        assertEquals("resqlink_incident_RL1001", IncidentNumbers.channelId("RL-1001"));
        assertTrue(IncidentNumbers.isIncidentChannel("resqlink_incident_RL1001"));
        assertFalse(IncidentNumbers.isIncidentChannel("other"));
        assertEquals("rl_user_7", IncidentNumbers.chatUserId(7));
    }
}
