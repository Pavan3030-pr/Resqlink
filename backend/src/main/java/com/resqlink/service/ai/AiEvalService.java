package com.resqlink.service.ai;

import com.resqlink.core.Category;
import com.resqlink.core.eval.AiEvaluator;
import com.resqlink.web.dto.Dtos.AiEvalReportDto;
import java.util.concurrent.atomic.AtomicLong;
import org.springframework.stereotype.Service;

/**
 * Runs the fixed evaluation set through the real analysis path (live Gemini when configured, otherwise the labelled
 * fallback) and reports measured accuracy, latency, fallback rate and an approximate token cost. Nothing is simulated:
 * with no API key the report describes the rule-based fallback and says so.
 */
@Service
public class AiEvalService {
    private final AiService ai;

    public AiEvalService(AiService ai) { this.ai = ai; }

    public AiEvalReportDto run(boolean heldOut) {
        AtomicLong in = new AtomicLong(), out = new AtomicLong();
        java.util.function.Function<String, com.resqlink.core.AnalysisResult> analyzer = text -> {
            AiService.Outcome o = ai.analyzeText(Category.OTHER, text, 17.385, 78.487, null, null);
            if ("OK".equals(o.status())) { in.addAndGet(o.inputChars() / 4); out.addAndGet(o.outputChars() / 4); }
            return o.result();
        };
        AiEvaluator.Report r = heldOut ? AiEvaluator.heldOut(analyzer) : AiEvaluator.run(analyzer);
        var cfg = ai.config();
        Double cost = (cfg.priceInPerMillion() == null || cfg.priceOutPerMillion() == null || !ai.modelConfigured()) ? null
                : (in.get() * cfg.priceInPerMillion() + out.get() * cfg.priceOutPerMillion()) / 1_000_000.0;
        String note = (ai.modelConfigured() ? "Live model path." : "No Gemini key configured: this measures the rule-based fallback only.")
                + " Tokens are estimated as characters/4. Cost is shown only when GEMINI_PRICE_* are set. Duplicate scoring here uses distance, time, category and"
                + " text only (no embeddings). "
                + (heldOut ? "Held-out set: not used to tune the rules." : "Development set: the fallback rules were tuned on it, so high scores here do not show generalisation.");
        return new AiEvalReportDto(ai.modelConfigured() ? "gemini+fallback" : "rule-based-fallback", r.cases(), r.categoryAccuracy(), r.priorityAccuracy(),
                r.criticalRecall(), r.injectionResistance(), r.injectionFlagRate(), r.duplicatePrecision(), r.duplicateRecall(),
                r.medianLatencyMs(), r.p95LatencyMs(), r.fallbackRate(), in.get(), out.get(), cost, r.failures(), note);
    }
}
