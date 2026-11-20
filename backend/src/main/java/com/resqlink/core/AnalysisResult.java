package com.resqlink.core;

import java.util.List;

/** Structured output of incident analysis (from Gemini or the rule-based fallback). */
public record AnalysisResult(
        Category suggestedCategory,
        Priority suggestedPriority,
        double confidence,
        String summary,
        List<String> keyInformation,
        List<String> missingInformation,
        String extractedLocation,
        String modelVersion) {
}
