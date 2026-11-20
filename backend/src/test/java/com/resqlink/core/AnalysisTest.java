package com.resqlink.core;

import static org.junit.jupiter.api.Assertions.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;

class AnalysisTest {
    private static Map<String, Object> valid() {
        Map<String, Object> m = new HashMap<>();
        m.put("suggestedCategory", "ACCIDENT");
        m.put("suggestedPriority", "HIGH");
        m.put("confidence", 0.82);
        m.put("summary", "Two-vehicle collision with one injured person.");
        m.put("keyInformation", List.of("Two vehicles", "One injured"));
        m.put("missingInformation", List.of("Is the injured person conscious?"));
        m.put("extractedLocation", "Tank Bund Road");
        return m;
    }

    @Test
    void acceptsValidOutput() {
        AnalysisResult r = AnalysisValidator.validate(valid(), "gemini-test");
        assertEquals(Category.ACCIDENT, r.suggestedCategory());
        assertEquals(Priority.HIGH, r.suggestedPriority());
        assertEquals("gemini-test", r.modelVersion());
        assertEquals(2, r.keyInformation().size());
    }

    @Test
    void rejectsUnknownPriority() {
        Map<String, Object> m = valid();
        m.put("suggestedPriority", "URGENT!!!");
        assertThrows(InvalidAnalysisException.class, () -> AnalysisValidator.validate(m, "x"));
    }

    @Test
    void rejectsOutOfRangeConfidenceAndWrongTypes() {
        Map<String, Object> m = valid();
        m.put("confidence", 1.5);
        assertThrows(InvalidAnalysisException.class, () -> AnalysisValidator.validate(m, "x"));
        Map<String, Object> m2 = valid();
        m2.put("confidence", "high");
        assertThrows(InvalidAnalysisException.class, () -> AnalysisValidator.validate(m2, "x"));
        Map<String, Object> m3 = valid();
        m3.put("keyInformation", "not-a-list");
        assertThrows(InvalidAnalysisException.class, () -> AnalysisValidator.validate(m3, "x"));
        assertThrows(InvalidAnalysisException.class, () -> AnalysisValidator.validate(null, "x"));
    }

    @Test
    void rejectsMissingOrOversizedSummary() {
        Map<String, Object> m = valid();
        m.remove("summary");
        assertThrows(InvalidAnalysisException.class, () -> AnalysisValidator.validate(m, "x"));
        Map<String, Object> big = valid();
        big.put("summary", "x".repeat(601));
        assertThrows(InvalidAnalysisException.class, () -> AnalysisValidator.validate(big, "x"));
    }

    @Test
    void heuristicMarksLifeThreateningAsCritical() {
        AnalysisResult r = HeuristicAnalyzer.analyze(Category.MEDICAL, "Man is unconscious and not breathing near City Hospital", false);
        assertEquals(Priority.CRITICAL, r.suggestedPriority());
        assertEquals(HeuristicAnalyzer.MODEL_VERSION, r.modelVersion());
        assertEquals("City Hospital", r.extractedLocation());
    }

    @Test
    void heuristicFireIsAtLeastHighAndGuessesCategory() {
        assertTrue(HeuristicAnalyzer.analyze(Category.FIRE, "small fire", false).suggestedPriority().weight() >= Priority.HIGH.weight());
        assertEquals(Category.FLOOD, HeuristicAnalyzer.analyze(Category.OTHER, "rising water in the colony", false).suggestedCategory());
    }

    @Test
    void heuristicOutputAlwaysPassesSchemaValidation() {
        for (String text : new String[]{"", "help", "Minor fender bender, no injuries, near Metro Station", "Fire in building, people trapped"}) {
            AnalysisResult r = HeuristicAnalyzer.analyze(Category.OTHER, text, true);
            Map<String, Object> m = new HashMap<>();
            m.put("suggestedCategory", r.suggestedCategory().name());
            m.put("suggestedPriority", r.suggestedPriority().name());
            m.put("confidence", r.confidence());
            m.put("summary", r.summary());
            m.put("keyInformation", r.keyInformation());
            m.put("missingInformation", r.missingInformation());
            m.put("extractedLocation", r.extractedLocation());
            assertNotNull(AnalysisValidator.validate(m, r.modelVersion()));
        }
    }
}
