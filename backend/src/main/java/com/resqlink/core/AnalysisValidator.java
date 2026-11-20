package com.resqlink.core;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;

/**
 * Strict schema validation for AI output. Anything that does not match the schema is rejected
 * so that malformed model output is never stored or shown as an analysis.
 *
 * Expected JSON object:
 * { "suggestedCategory": "ACCIDENT|FIRE|FLOOD|MEDICAL|OTHER",
 *   "suggestedPriority": "CRITICAL|HIGH|MEDIUM|LOW",
 *   "confidence": 0..1,
 *   "summary": "string (1..600 chars)",
 *   "keyInformation": ["string", ...],
 *   "missingInformation": ["string", ...],
 *   "extractedLocation": "string or null" }
 */
public final class AnalysisValidator {
    private static final int MAX_SUMMARY = 600;
    private static final int MAX_ITEMS = 10;
    private static final int MAX_ITEM_LEN = 200;

    private AnalysisValidator() {}

    public static AnalysisResult validate(Map<String, Object> json, String modelVersion) {
        if (json == null) throw new InvalidAnalysisException("analysis is empty");

        Category category;
        Priority priority;
        try {
            category = Category.parse(asString(json.get("suggestedCategory"), "suggestedCategory"));
            priority = Priority.parse(asString(json.get("suggestedPriority"), "suggestedPriority"));
        } catch (IllegalArgumentException e) {
            throw new InvalidAnalysisException(e.getMessage());
        }

        Object conf = json.get("confidence");
        if (!(conf instanceof Number n)) throw new InvalidAnalysisException("confidence must be a number");
        double confidence = n.doubleValue();
        if (Double.isNaN(confidence) || confidence < 0.0 || confidence > 1.0) {
            throw new InvalidAnalysisException("confidence must be between 0 and 1");
        }

        String summary = asString(json.get("summary"), "summary").trim();
        if (summary.isEmpty() || summary.length() > MAX_SUMMARY) {
            throw new InvalidAnalysisException("summary must be 1.." + MAX_SUMMARY + " characters");
        }

        List<String> key = asStringList(json.get("keyInformation"), "keyInformation");
        List<String> missing = asStringList(json.get("missingInformation"), "missingInformation");

        Object loc = json.get("extractedLocation");
        String location = null;
        if (loc != null) {
            if (!(loc instanceof String s)) throw new InvalidAnalysisException("extractedLocation must be a string or null");
            location = s.isBlank() ? null : s.trim();
            if (location != null && location.length() > MAX_ITEM_LEN) {
                throw new InvalidAnalysisException("extractedLocation too long");
            }
        }
        return new AnalysisResult(category, priority, confidence, summary, key, missing, location, modelVersion);
    }

    private static String asString(Object o, String field) {
        if (!(o instanceof String s)) throw new InvalidAnalysisException(field + " must be a string");
        return s;
    }

    private static List<String> asStringList(Object o, String field) {
        if (o == null) return Collections.emptyList();
        if (!(o instanceof List<?> list)) throw new InvalidAnalysisException(field + " must be an array");
        if (list.size() > MAX_ITEMS) throw new InvalidAnalysisException(field + " has too many items");
        List<String> out = new ArrayList<>();
        for (Object item : list) {
            if (!(item instanceof String s)) throw new InvalidAnalysisException(field + " must contain only strings");
            String t = s.trim();
            if (t.isEmpty()) continue;
            if (t.length() > MAX_ITEM_LEN) throw new InvalidAnalysisException(field + " item too long");
            out.add(t);
        }
        return out;
    }
}
