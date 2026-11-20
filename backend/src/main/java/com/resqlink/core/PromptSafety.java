package com.resqlink.core;

import java.util.List;
import java.util.Locale;
import java.util.regex.Pattern;

/**
 * Prepares untrusted citizen text for an external AI provider: removes personal identifiers, strips control
 * characters, bounds length and flags likely prompt-injection attempts so a dispatcher can see them.
 */
public final class PromptSafety {
    public static final int MAX_CHARS = 1500;
    private static final Pattern EMAIL = Pattern.compile("[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}");
    private static final Pattern LONG_NUMBER = Pattern.compile("(?<!\\d)(?:\\+?\\d[\\s().-]?){9,}(?!\\d)");
    private static final Pattern CONTROL = Pattern.compile("[\\p{Cc}&&[^\\n\\t]]");
    private static final List<String> INJECTION_MARKERS = List.of(
            "ignore previous", "ignore all previous", "ignore the above", "disregard previous", "disregard the above",
            "forget your instructions", "system prompt", "you are now", "new instructions", "act as", "developer mode",
            "jailbreak", "reveal your", "mark this as low", "mark as low", "set priority", "priority to low", "do not dispatch",
            "```", "</", "<system", "assistant:", "system:");

    private static final List<Pattern> INJECTION_PATTERNS = List.of(
            Pattern.compile("(ignore|disregard|override|bypass|forget)\\W+(\\w+\\W+){0,4}(rules|instructions|prompt|guidelines|policy)", Pattern.CASE_INSENSITIVE),
            Pattern.compile("you\\s+(must|should|will|have to)\\s+(output|respond|answer|classify|set|mark|reply)", Pattern.CASE_INSENSITIVE),
            Pattern.compile("(classify|label|mark|rate)\\s+(this|it|the report)\\s+as\\s+(non[- ]?emergency|low|false|spam)", Pattern.CASE_INSENSITIVE),
            Pattern.compile("(output|return|set)\\s+(the\\s+)?priority\\s*(to|as|=|:)?\\s*(low|medium|none)", Pattern.CASE_INSENSITIVE),
            Pattern.compile("as\\s+the\\s+(dispatcher|system|admin|assistant|ai)\\b", Pattern.CASE_INSENSITIVE));

    private PromptSafety() {}

    public record Prepared(String text, boolean redacted, boolean suspectedInjection, boolean truncated) {}

    public static Prepared prepare(String raw) {
        String s = raw == null ? "" : raw;
        boolean injection = looksLikeInjection(s);
        String cleaned = CONTROL.matcher(s).replaceAll(" ");
        String afterEmail = EMAIL.matcher(cleaned).replaceAll("[email removed]");
        String afterPhone = LONG_NUMBER.matcher(afterEmail).replaceAll("[number removed]");
        boolean redacted = !afterPhone.equals(cleaned);
        boolean truncated = afterPhone.length() > MAX_CHARS;
        String text = truncated ? afterPhone.substring(0, MAX_CHARS) : afterPhone;
        return new Prepared(text.trim(), redacted, injection, truncated);
    }

    public static boolean looksLikeInjection(String s) {
        if (s == null) return false;
        String lower = s.toLowerCase(Locale.ROOT);
        for (String m : INJECTION_MARKERS) if (lower.contains(m)) return true;
        for (Pattern p : INJECTION_PATTERNS) if (p.matcher(s).find()) return true;
        return false;
    }

    /** Rounds to 3 decimals (about 100 m): enough for triage context without sending an exact position. */
    public static double coarse(double coordinate) { return Math.round(coordinate * 1000.0) / 1000.0; }
}
