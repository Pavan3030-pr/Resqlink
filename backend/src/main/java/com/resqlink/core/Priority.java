package com.resqlink.core;

/** Incident priority, highest first. */
public enum Priority {
    CRITICAL(4), HIGH(3), MEDIUM(2), LOW(1);

    private final int weight;

    Priority(int weight) { this.weight = weight; }

    public int weight() { return weight; }

    public static Priority parse(String raw) {
        if (raw == null) throw new IllegalArgumentException("priority is required");
        try {
            return Priority.valueOf(raw.trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("unknown priority: " + raw);
        }
    }
}
