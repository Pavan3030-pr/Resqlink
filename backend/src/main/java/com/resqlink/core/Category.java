package com.resqlink.core;

/** Emergency categories supported by the reporting form. */
public enum Category {
    ACCIDENT, FIRE, FLOOD, MEDICAL, OTHER;

    public static Category parse(String raw) {
        if (raw == null) throw new IllegalArgumentException("category is required");
        String v = raw.trim().toUpperCase().replace(' ', '_');
        if (v.equals("MEDICAL_EMERGENCY")) v = "MEDICAL";
        if (v.equals("ROAD_ACCIDENT")) v = "ACCIDENT";
        try {
            return Category.valueOf(v);
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("unknown category: " + raw);
        }
    }
}
