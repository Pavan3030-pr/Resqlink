package com.resqlink.core;

/** Human-readable incident numbers and Nexconn channel identifiers. */
public final class IncidentNumbers {
    public static final int FIRST = 1001;
    public static final String CHANNEL_PREFIX = "resqlink_incident_";

    private IncidentNumbers() {}

    /** @param sequence a database sequence value (starting at {@link #FIRST}) */
    public static String format(long sequence) { return "RL-" + sequence; }

    /** "RL-1001" → "resqlink_incident_RL1001" */
    public static String channelId(String incidentNumber) {
        return CHANNEL_PREFIX + incidentNumber.replace("-", "");
    }

    public static boolean isIncidentChannel(String channelId) {
        return channelId != null && channelId.startsWith(CHANNEL_PREFIX);
    }

    /** Nexconn user id for an application user id. */
    public static String chatUserId(long userId) { return "rl_user_" + userId; }
}
