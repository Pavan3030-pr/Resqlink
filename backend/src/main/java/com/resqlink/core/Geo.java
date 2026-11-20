package com.resqlink.core;

/** Small geographic helpers (the database uses PostGIS; this mirrors it for in-memory scoring). */
public final class Geo {
    private static final double EARTH_RADIUS_M = 6_371_008.8;

    private Geo() {}

    public static boolean validLatitude(double lat) { return lat >= -90 && lat <= 90; }

    public static boolean validLongitude(double lng) { return lng >= -180 && lng <= 180; }

    /** Great-circle distance in metres. */
    public static double haversineMeters(double lat1, double lng1, double lat2, double lng2) {
        double p1 = Math.toRadians(lat1);
        double p2 = Math.toRadians(lat2);
        double dp = Math.toRadians(lat2 - lat1);
        double dl = Math.toRadians(lng2 - lng1);
        double a = Math.sin(dp / 2) * Math.sin(dp / 2)
                + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) * Math.sin(dl / 2);
        return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1.0, Math.sqrt(a)));
    }
}
