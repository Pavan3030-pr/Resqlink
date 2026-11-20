package com.resqlink.core;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

/** Finds open incidents that no available responder can reach within a service radius (coverage gaps). */
public final class CoverageAnalyzer {
    public static final double DEFAULT_RADIUS_M = 10_000;

    private CoverageAnalyzer() {}

    public record Site(long incidentId, String number, double lat, double lng, Priority priority) {}

    public record Unit(long userId, double lat, double lng) {}

    public record Gap(long incidentId, String number, Priority priority, Double nearestMeters, String reason) {}

    public static List<Gap> gaps(List<Site> incidents, List<Unit> availableLocated, int availableUnlocated, double radiusMeters) {
        List<Gap> out = new ArrayList<>();
        for (Site s : incidents) {
            Double nearest = null;
            for (Unit u : availableLocated) {
                double d = Geo.haversineMeters(s.lat(), s.lng(), u.lat(), u.lng());
                if (nearest == null || d < nearest) nearest = d;
            }
            if (nearest == null) {
                out.add(new Gap(s.incidentId(), s.number(), s.priority(), null,
                        availableUnlocated > 0 ? "No available responder is sharing a location" : "No available responders"));
            } else if (nearest > radiusMeters) {
                out.add(new Gap(s.incidentId(), s.number(), s.priority(), (double) Math.round(nearest),
                        "Nearest available responder is beyond " + Math.round(radiusMeters / 1000) + " km"));
            }
        }
        out.sort(Comparator.comparingInt((Gap g) -> g.priority() == null ? 0 : -g.priority().weight()).thenComparing(Gap::number));
        return out;
    }
}
