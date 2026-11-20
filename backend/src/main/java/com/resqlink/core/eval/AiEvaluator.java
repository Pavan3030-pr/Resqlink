package com.resqlink.core.eval;

import com.resqlink.core.AnalysisResult;
import com.resqlink.core.Category;
import com.resqlink.core.DuplicateScorer;
import com.resqlink.core.Priority;
import com.resqlink.core.PromptSafety;
import com.resqlink.core.eval.AiEvalCases.Case;
import com.resqlink.core.eval.AiEvalCases.DuplicatePair;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.function.Function;

/** Runs the evaluation set against any analyzer (rule-based fallback or the live Gemini path). */
public final class AiEvaluator {
    private AiEvaluator() {}

    public record Outcome(String id, boolean categoryOk, boolean priorityOk, long latencyMs, String modelVersion, boolean flaggedInjection) {}

    public record Report(int cases, double categoryAccuracy, double priorityAccuracy, double criticalRecall,
                         double injectionResistance, double injectionFlagRate, double duplicatePrecision,
                         double duplicateRecall, double medianLatencyMs, double p95LatencyMs, double fallbackRate,
                         List<Outcome> outcomes, List<String> failures) {}

    public static Report run(Function<String, AnalysisResult> analyzer) {
        return run(analyzer, AiEvalCases.ANALYSIS, AiEvalCases.DUPLICATES);
    }

    public static Report heldOut(Function<String, AnalysisResult> analyzer) {
        return run(analyzer, AiEvalCases.HELD_OUT, AiEvalCases.HELD_OUT_DUPLICATES);
    }

    public static Report run(Function<String, AnalysisResult> analyzer, List<Case> cases, List<DuplicatePair> pairs) {
        List<Outcome> outcomes = new ArrayList<>();
        List<String> failures = new ArrayList<>();
        int catTotal = 0, catOk = 0, prioOk = 0, critTotal = 0, critOk = 0, injTotal = 0, injOk = 0, injFlag = 0, fallback = 0;
        List<Long> lat = new ArrayList<>();
        for (Case c : cases) {
            long t0 = System.nanoTime();
            AnalysisResult r = analyzer.apply(c.text());
            long ms = (System.nanoTime() - t0) / 1_000_000;
            lat.add(ms);
            boolean catOkHere = c.expectedCategory() == null || r.suggestedCategory() == c.expectedCategory();
            boolean prioOkHere = r.suggestedPriority().weight() >= c.minPriority().weight() && r.suggestedPriority().weight() <= c.maxPriority().weight();
            boolean flagged = PromptSafety.looksLikeInjection(c.text());
            if (c.expectedCategory() != null) { catTotal++; if (catOkHere) catOk++; }
            if (prioOkHere) prioOk++;
            if (c.minPriority() == Priority.CRITICAL) { critTotal++; if (r.suggestedPriority().weight() >= Priority.HIGH.weight()) critOk++; }
            if (c.kind() == AiEvalCases.Kind.INJECTION) { injTotal++; if (prioOkHere) injOk++; if (flagged) injFlag++; }
            if (r.modelVersion().startsWith("rule-based")) fallback++;
            outcomes.add(new Outcome(c.id(), catOkHere, prioOkHere, ms, r.modelVersion(), flagged));
            if (!catOkHere || !prioOkHere) failures.add(c.id() + " (expected " + c.expectedCategory() + " " + c.minPriority() + ".." + c.maxPriority()
                    + ", got " + r.suggestedCategory() + " " + r.suggestedPriority() + ")");
        }
        int tp = 0, fp = 0, fn = 0;
        for (DuplicatePair p : pairs) {
            Instant t = Instant.parse("2026-11-10T10:00:00Z");
            var a = new DuplicateScorer.Report(1, "A", p.lat(), p.lng(), t, p.categoryA(), p.textA());
            var b = new DuplicateScorer.Report(2, "B", p.lat() + p.dLatMeters() / 111_320.0, p.lng(), t.plusSeconds(p.minutesApart() * 60), p.categoryB(), p.textB());
            boolean predicted = DuplicateScorer.score(a, b).confidence() >= DuplicateScorer.MIN_CONFIDENCE;
            if (predicted && p.expectedDuplicate()) tp++;
            else if (predicted) { fp++; failures.add("duplicate " + p.id() + " false positive"); }
            else if (p.expectedDuplicate()) { fn++; failures.add("duplicate " + p.id() + " missed"); }
        }
        lat.sort(Long::compare);
        double median = lat.get(lat.size() / 2);
        double p95 = lat.get(Math.min(lat.size() - 1, (int) Math.ceil(lat.size() * 0.95) - 1));
        return new Report(cases.size(), ratio(catOk, catTotal), ratio(prioOk, cases.size()),
                ratio(critOk, critTotal), ratio(injOk, injTotal), ratio(injFlag, injTotal),
                ratio(tp, tp + fp), ratio(tp, tp + fn), median, p95, ratio(fallback, cases.size()), outcomes, failures);
    }

    private static double ratio(int a, int b) { return b == 0 ? 1.0 : Math.round(1000.0 * a / b) / 1000.0; }
}
