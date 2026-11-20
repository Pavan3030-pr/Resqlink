package com.resqlink.live;

/**
 * A small "something changed" hint pushed to browsers. It carries no private data: clients react by re-reading the
 * authoritative state from the REST API, which makes duplicate and out-of-order events harmless.
 * {@code userId} targets one user (notifications); otherwise the event is filtered by incident access.
 */
public record LiveEvent(String type, Long incidentId, Long userId, boolean staffOnly) {
    public static LiveEvent incident(String type, Long incidentId) { return new LiveEvent(type, incidentId, null, false); }

    public static LiveEvent toUser(Long userId, String type, Long incidentId) { return new LiveEvent(type, incidentId, userId, false); }

    public static LiveEvent staff(String type) { return new LiveEvent(type, null, null, true); }
}
