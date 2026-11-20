package com.resqlink.core;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;

/**
 * Recommends responders for an incident using distance, availability, responder type and workload.
 * This is advisory: the dispatcher always makes the final assignment decision.
 */
public final class ResponderRanker {
    private static final double MAX_USEFUL_DISTANCE_M = 25_000.0;

    private ResponderRanker() {}

    public record Responder(long userId, String name, String type, boolean available,
                            Double lat, Double lng, int activeAssignments) {}

    public record Recommendation(long userId, String name, String type, double score,
                                 Double distanceMeters, List<String> reasons) {}

    /** Which responder types suit which incident categories (first entries are the best fit). */
    public static List<String> preferredTypes(Category category) {
        return switch (category) {
            case FIRE -> List.of("FIRE_BRIGADE", "RESCUE", "GENERAL");
            case FLOOD -> List.of("RESCUE", "FIRE_BRIGADE", "GENERAL");
            case MEDICAL -> List.of("AMBULANCE", "PARAMEDIC", "GENERAL");
            case ACCIDENT -> List.of("AMBULANCE", "RESCUE", "POLICE", "GENERAL");
            case OTHER -> List.of("GENERAL", "RESCUE", "VOLUNTEER");
        };
    }

    public static List<Recommendation> rank(Category category, Priority priority,
                                            double incidentLat, double incidentLng,
                                            List<Responder> responders, int limit) {
        List<String> preferred = preferredTypes(category);
        List<Recommendation> out = new ArrayList<>();
        for (Responder r : responders) {
            if (!r.available()) continue;
            List<String> reasons = new ArrayList<>();

            double distScore = 0.35; // unknown location gets a neutral-low score
            Double distance = null;
            if (r.lat() != null && r.lng() != null) {
                distance = Geo.haversineMeters(incidentLat, incidentLng, r.lat(), r.lng());
                distScore = Math.max(0.0, 1.0 - distance / MAX_USEFUL_DISTANCE_M);
                reasons.add(String.format(Locale.ROOT, "%.1f km away", distance / 1000.0));
            } else {
                reasons.add("Location not shared");
            }

            int idx = preferred.indexOf(r.type() == null ? "" : r.type().toUpperCase(Locale.ROOT));
            double typeScore = idx < 0 ? 0.1 : 1.0 - (idx * 0.25);
            if (idx == 0) reasons.add("Best-fit type for " + category.name().toLowerCase(Locale.ROOT));
            else if (idx > 0) reasons.add("Suitable type (" + r.type() + ")");
            else reasons.add("Type not specialised for this incident");

            double workScore = Math.max(0.0, 1.0 - 0.34 * r.activeAssignments());
            reasons.add(r.activeAssignments() == 0 ? "No active assignments"
                    : r.activeAssignments() + " active assignment(s)");

            // Closer proximity matters more for the most urgent incidents.
            double distWeight = priority.weight() >= Priority.HIGH.weight() ? 0.50 : 0.40;
            double typeWeight = 0.35;
            double workWeight = 1.0 - distWeight - typeWeight;
            double score = distWeight * distScore + typeWeight * typeScore + workWeight * workScore;
            score = Math.round(score * 1000.0) / 1000.0;
            out.add(new Recommendation(r.userId(), r.name(), r.type(), score, distance, reasons));
        }
        out.sort(Comparator.comparingDouble(Recommendation::score).reversed());
        return out.size() > limit ? new ArrayList<>(out.subList(0, limit)) : out;
    }
}
