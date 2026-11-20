package com.resqlink.core;

import static org.junit.jupiter.api.Assertions.*;

import com.resqlink.core.eval.AiEvaluator;
import java.util.function.Function;
import org.junit.jupiter.api.Test;

/**
 * Regression guard for the rule-based fallback. The development set was used to tune the rules (so 100% is expected and
 * proves nothing about generalisation). The held-out set was written afterwards; its thresholds are pinned at the
 * measured values so a code change cannot silently make the fallback worse.
 */
class AiEvalTest {
    private final Function<String, AnalysisResult> fallback = t -> HeuristicAnalyzer.analyze(Category.OTHER, t, false);

    @Test
    void developmentSet() {
        var r = AiEvaluator.run(fallback);
        assertEquals(1.0, r.categoryAccuracy(), r.failures().toString());
        assertEquals(1.0, r.priorityAccuracy(), r.failures().toString());
        assertEquals(1.0, r.duplicatePrecision(), r.failures().toString());
        assertEquals(1.0, r.duplicateRecall());
        assertEquals(1.0, r.injectionResistance());
    }

    @Test
    void heldOutSetNeverRegresses() {
        var r = AiEvaluator.heldOut(fallback);
        assertTrue(r.categoryAccuracy() >= 0.54, "category accuracy " + r.categoryAccuracy());
        assertTrue(r.priorityAccuracy() >= 0.85, "priority accuracy " + r.priorityAccuracy());
        assertEquals(1.0, r.criticalRecall(), "critical incidents must never be missed by the fallback");
        assertEquals(1.0, r.injectionResistance(), "injected instructions must not lower the priority");
        assertEquals(1.0, r.duplicateRecall());
        assertTrue(r.duplicatePrecision() >= 0.66, "duplicate precision " + r.duplicatePrecision());
    }

    @Test
    void injectionAttemptsDoNotLowerPriorityAndAreFlagged() {
        for (var c : com.resqlink.core.eval.AiEvalCases.ANALYSIS) {
            if (c.kind() != com.resqlink.core.eval.AiEvalCases.Kind.INJECTION) continue;
            assertTrue(PromptSafety.looksLikeInjection(c.text()), c.id());
            assertTrue(fallback.apply(c.text()).suggestedPriority().weight() >= c.minPriority().weight(), c.id());
        }
        for (var c : com.resqlink.core.eval.AiEvalCases.HELD_OUT) {
            if (c.kind() == com.resqlink.core.eval.AiEvalCases.Kind.INJECTION) assertTrue(PromptSafety.looksLikeInjection(c.text()), c.id());
        }
    }
}
