package com.resqlink.core;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

/**
 * Scores how likely a new report duplicates an existing one using distance, time difference,
 * category and text similarity. The result is only a suggestion: reports are never discarded
 * automatically; a dispatcher decides.
 */
public final class DuplicateScorer {
    public static final double MAX_DISTANCE_M = 1000.0;
    public static final double MAX_MINUTES = 180.0;
    public static final double MIN_CONFIDENCE = 0.5;

    private static final double W_DISTANCE = 0.40;
    private static final double W_TIME = 0.20;
    private static final double W_CATEGORY = 0.15;
    private static final double W_TEXT = 0.25;

    private DuplicateScorer() {}

    public record Report(long id, String number, double lat, double lng, Instant at, Category category, String text) {}

    public record Match(long incidentId, String incidentNumber, double confidence,
                        double distanceMeters, long minutesApart, List<String> reasons,
                        Double semanticSimilarity) {}

    public static Match score(Report fresh, Report existing) { return score(fresh, existing, null); }

    /**
     * @param semantic optional embedding cosine similarity in [0,1]; when present it dominates the text component
     *                 (0.7 semantic + 0.3 token overlap), which catches paraphrases and other languages.
     */
    public static Match score(Report fresh, Report existing, Double semantic) {
        double dist = Geo.haversineMeters(fresh.lat(), fresh.lng(), existing.lat(), existing.lng());
        long minutes = Math.abs(Duration.between(fresh.at(), existing.at()).toMinutes());

        double distScore = Math.max(0.0, 1.0 - dist / MAX_DISTANCE_M);
        double timeScore = Math.max(0.0, 1.0 - minutes / MAX_MINUTES);
        double catScore = fresh.category() == existing.category() ? 1.0 : 0.0;
        double lexical = TextSimilarity.jaccard(fresh.text(), existing.text());
        double textScore = semantic == null ? lexical : 0.7 * Math.max(0.0, Math.min(1.0, semantic)) + 0.3 * lexical;

        double confidence = W_DISTANCE * distScore + W_TIME * timeScore + W_CATEGORY * catScore + W_TEXT * textScore;
        // Hard gates: far apart, far apart in time, a different kind of event, or embeddings that disagree can never
        // reach the suggestion threshold, however similar the remaining signals look.
        boolean farApart = dist > MAX_DISTANCE_M || minutes > MAX_MINUTES;
        boolean differentEvent = catScore == 0.0 && (semantic == null || semantic < 0.8);
        boolean embeddingsDisagree = semantic != null && semantic < 0.35;
        if (farApart || differentEvent || embeddingsDisagree) confidence = Math.min(confidence, 0.45);
        confidence = Math.round(Math.min(1.0, Math.max(0.0, confidence)) * 1000.0) / 1000.0;

        List<String> reasons = new ArrayList<>();
        if (dist <= 200) reasons.add("Within " + Math.round(dist) + " m of the earlier report");
        else if (dist <= MAX_DISTANCE_M) reasons.add("About " + Math.round(dist) + " m from the earlier report");
        if (minutes <= 30) reasons.add("Reported " + minutes + " min apart");
        if (catScore == 1.0) reasons.add("Same category (" + fresh.category() + ")");
        if (semantic != null && semantic >= 0.75) reasons.add("Descriptions mean the same thing (semantic match " + Math.round(semantic * 100) + "%)");
        else if (textScore >= 0.25) reasons.add("Similar wording in the description");
        return new Match(existing.id(), existing.number(), confidence, Math.round(dist), minutes, reasons, semantic);
    }

    /** Returns matches at or above {@link #MIN_CONFIDENCE}, best first, capped at {@code limit}. */
    public static List<Match> rank(Report fresh, List<Report> candidates, int limit) {
        return rank(fresh, candidates, limit, java.util.Map.of());
    }

    /** Same as {@link #rank(Report, List, int)} with optional per-candidate semantic similarities (by incident id). */
    public static List<Match> rank(Report fresh, List<Report> candidates, int limit, java.util.Map<Long, Double> semantic) {
        List<Match> out = new ArrayList<>();
        for (Report c : candidates) {
            if (c.id() == fresh.id()) continue;
            Match m = score(fresh, c, semantic.get(c.id()));
            if (m.confidence() >= MIN_CONFIDENCE) out.add(m);
        }
        out.sort(Comparator.comparingDouble(Match::confidence).reversed());
        return out.size() > limit ? new ArrayList<>(out.subList(0, limit)) : out;
    }
}
