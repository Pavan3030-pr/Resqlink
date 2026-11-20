package com.resqlink.core;

import static org.junit.jupiter.api.Assertions.*;

import java.time.Instant;
import java.util.List;
import org.junit.jupiter.api.Test;

class DuplicateScorerTest {
    private static final Instant T0 = Instant.parse("2026-11-10T10:00:00Z");

    private static DuplicateScorer.Report r(long id, double lat, double lng, Instant at, Category c, String text) {
        return new DuplicateScorer.Report(id, "RL-" + (1000 + id), lat, lng, at, c, text);
    }

    @Test
    void sameAccidentSeenTwiceScoresHigh() {
        var a = r(1, 17.3850, 78.4867, T0, Category.ACCIDENT, "Two cars collided near Tank Bund, one person injured");
        var b = r(2, 17.3853, 78.4869, T0.plusSeconds(300), Category.ACCIDENT, "Car collision at Tank Bund with an injured person");
        var m = DuplicateScorer.score(a, b);
        assertTrue(m.confidence() >= 0.8, "confidence " + m.confidence());
        assertFalse(m.reasons().isEmpty());
    }

    @Test
    void farAwayDifferentIncidentScoresLow() {
        var a = r(1, 17.3850, 78.4867, T0, Category.ACCIDENT, "Car collision with injured person");
        var b = r(2, 17.4500, 78.3800, T0.plusSeconds(7200), Category.FIRE, "Shop on fire, smoke spreading");
        assertTrue(DuplicateScorer.score(a, b).confidence() < 0.3);
    }

    @Test
    void rankFiltersBelowThresholdAndSortsBestFirst() {
        var fresh = r(10, 17.3850, 78.4867, T0, Category.FLOOD, "Water rising on the road, cars stuck");
        var close = r(11, 17.3852, 78.4868, T0.plusSeconds(120), Category.FLOOD, "Road flooded, water rising and cars stuck");
        var medium = r(12, 17.3900, 78.4900, T0.plusSeconds(1800), Category.FLOOD, "Flooding on main road");
        var far = r(13, 18.1000, 79.0000, T0, Category.FIRE, "Warehouse fire");
        List<DuplicateScorer.Match> out = DuplicateScorer.rank(fresh, List.of(far, medium, close, fresh), 5);
        assertFalse(out.isEmpty());
        assertEquals(11L, out.get(0).incidentId());
        for (var m : out) assertTrue(m.confidence() >= DuplicateScorer.MIN_CONFIDENCE);
        assertTrue(out.stream().noneMatch(m -> m.incidentId() == 10L), "must not match itself");
        assertTrue(out.stream().noneMatch(m -> m.incidentId() == 13L));
    }

    @Test
    void limitIsRespected() {
        var fresh = r(1, 17.0, 78.0, T0, Category.FIRE, "fire in market building");
        var list = List.of(
                r(2, 17.0001, 78.0001, T0, Category.FIRE, "fire in market building"),
                r(3, 17.0002, 78.0001, T0, Category.FIRE, "fire in market building"),
                r(4, 17.0003, 78.0001, T0, Category.FIRE, "fire in market building"));
        assertEquals(2, DuplicateScorer.rank(fresh, list, 2).size());
    }

    @Test
    void semanticSimilarityCatchesParaphrasesAndOtherLanguages() {
        var a = r(1, 17.3850, 78.4867, T0, Category.ACCIDENT, "Vehicles crashed at the flyover");
        var b = r(2, 17.3852, 78.4868, T0.plusSeconds(180), Category.ACCIDENT, "ఫ్లైఓవర్ దగ్గర రెండు వాహనాలు ఢీకొన్నాయి");
        double lexical = DuplicateScorer.score(a, b).confidence();
        var withSemantic = DuplicateScorer.score(a, b, 0.92);
        assertTrue(withSemantic.confidence() > lexical, "semantic should raise confidence");
        assertTrue(withSemantic.confidence() >= DuplicateScorer.MIN_CONFIDENCE);
        assertEquals(0.92, withSemantic.semanticSimilarity(), 1e-9);
        assertTrue(withSemantic.reasons().stream().anyMatch(x -> x.contains("semantic")));
        assertNull(DuplicateScorer.score(a, b).semanticSimilarity());
    }

    @Test
    void rankUsesSemanticMapWhenProvided() {
        var fresh = r(10, 17.3850, 78.4867, T0, Category.FIRE, "building ablaze");
        var other = r(11, 17.3855, 78.4870, T0.plusSeconds(60), Category.FIRE, "flames in apartment block");
        assertTrue(DuplicateScorer.rank(fresh, List.of(other), 5, java.util.Map.of(11L, 0.9)).get(0).confidence()
                >= DuplicateScorer.rank(fresh, List.of(other), 5).get(0).confidence());
    }
}
