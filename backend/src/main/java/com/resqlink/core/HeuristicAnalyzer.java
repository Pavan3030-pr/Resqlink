package com.resqlink.core;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Deterministic rule-based analysis used when the AI service is unavailable or returns invalid output.
 * Results are labelled with model version "rule-based-fallback" so dispatchers can tell them apart.
 */
public final class HeuristicAnalyzer {
    public static final String MODEL_VERSION = "rule-based-fallback";

    private static final List<String> CRITICAL_WORDS = List.of(
            "unconscious", "not breathing", "no pulse", "trapped", "explosion", "collapsed", "heavy bleeding",
            "severe bleeding", "drowning", "gas leak", "cardiac", "heart attack", "fatal", "dead", "burning building",
            // Hindi / Telugu (common emergency words; the fallback cannot translate, it only recognises these terms)
            "बेहोश", "सांस नहीं", "फंसे", "స్పృహ", "శ్వాస ఆగ", "ఇరుక్కు");
    private static final List<String> HIGH_WORDS = List.of(
            "fire", "injured", "injury", "bleeding", "fracture", "flood", "rising water", "overturned", "collision",
            "crash", "smoke", "stuck", "multiple", "children", "pregnant", "chest pain", "stroke",
            "घायल", "धुआं", "टक्कर", "आग", "గాయాల", "ఢీకొ", "పొగ", "మంట");
    private static final List<String> LOW_WORDS = List.of(
            "minor", "no injuries", "no injury", "nobody hurt", "fender", "scratch", "blocked road", "fallen tree");

    private static final Pattern LOCATION = Pattern.compile(
            "\\b(?:near|at|opposite|behind|beside|on)\\s+([A-Z][\\w'.-]*(?:\\s+[A-Z][\\w'.-]*){0,4})");

    private HeuristicAnalyzer() {}

    public static AnalysisResult analyze(Category userCategory, String description, boolean hasImage) {
        String text = description == null ? "" : description.trim();
        String lower = text.toLowerCase(Locale.ROOT);

        Category category = userCategory != null ? userCategory : Category.OTHER;
        if (category == Category.OTHER) category = guessCategory(lower);

        Priority priority = Priority.MEDIUM;
        List<String> key = new ArrayList<>();
        for (String w : CRITICAL_WORDS) if (lower.contains(w)) { key.add("Reported: " + w); priority = Priority.CRITICAL; }
        if (priority != Priority.CRITICAL) {
            for (String w : HIGH_WORDS) if (lower.contains(w)) { key.add("Reported: " + w); priority = Priority.HIGH; }
        }
        if (priority == Priority.MEDIUM) {
            for (String w : LOW_WORDS) if (lower.contains(w)) { key.add("Reported: " + w); priority = Priority.LOW; break; }
        }
        if (category == Category.FIRE && priority.weight() < Priority.HIGH.weight()) priority = Priority.HIGH;
        if (hasImage) key.add("Photo evidence attached");
        if (mostlyNonLatin(text)) key.add("Report is not in English; the rule-based fallback only recognises common emergency words and cannot translate it");
        if (key.size() > 8) key = new ArrayList<>(key.subList(0, 8));

        List<String> missing = new ArrayList<>();
        if (text.length() < 25) missing.add("Can you describe what happened in more detail?");
        if (!lower.matches(".*\\b(\\d+|one|two|three|four|five|several|many|multiple)\\b.*(people|persons|victims|injured|vehicles|cars|trapped|children).*")) {
            missing.add("How many people are affected or injured?");
        }
        if (category == Category.ACCIDENT && !lower.contains("vehicle") && !lower.contains("car")
                && !lower.contains("bike") && !lower.contains("truck") && !lower.contains("bus")) {
            missing.add("Which vehicles are involved?");
        }
        if (category == Category.FIRE && !lower.contains("spreading") && !lower.contains("contained")) {
            missing.add("Is the fire spreading, and is anyone still inside?");
        }
        if (category == Category.FLOOD && !lower.contains("water level") && !lower.contains("rising")) {
            missing.add("How high is the water and is it still rising?");
        }
        if (category == Category.MEDICAL && !lower.contains("conscious") && !lower.contains("breathing")) {
            missing.add("Is the person conscious and breathing?");
        }

        String location = null;
        Matcher m = LOCATION.matcher(text);
        if (m.find()) location = m.group(1).trim();

        String shortText = text.length() > 280 ? text.substring(0, 277) + "..." : text;
        String summary = shortText.isEmpty()
                ? "No description was provided for this " + category.name().toLowerCase(Locale.ROOT) + " report."
                : category.name().charAt(0) + category.name().substring(1).toLowerCase(Locale.ROOT)
                        + " report: " + shortText;
        if (summary.length() > 600) summary = summary.substring(0, 597) + "...";

        double confidence = key.isEmpty() ? 0.35 : Math.min(0.7, 0.45 + 0.05 * key.size());
        return new AnalysisResult(category, priority, confidence, summary, key, missing, location, MODEL_VERSION);
    }

    private static boolean any(String s, String... words) {
        for (String w : words) if (s.contains(w)) return true;
        return false;
    }

    static Category guessCategory(String lower) {
        if (any(lower, "fire", "smoke", "burning", "आग", "अग्नि", "धुआं", "మంట", "అగ్ని", "పొగ")) return Category.FIRE;
        if (any(lower, "flood", "water level", "rising water", "बाढ़", "जलभराव", "పानీ".substring(0, 0) + "వరద")) return Category.FLOOD;
        if (any(lower, "accident", "collision", "collided", "crash", "overturned", "vehicle", "fender", "bumper",
                "दुर्घटना", "टक्कर", "हादसा", "ప్రమాదం", "ఢీకొ", "వాహన")) return Category.ACCIDENT;
        if (any(lower, "unconscious", "chest pain", "heart", "bleeding", "breathing", "stroke", "collapsed",
                "बेहोश", "सांस", "दिल का दौरा", "స్పృహ", "శ్వాస", "గుండె")) return Category.MEDICAL;
        return Category.OTHER;
    }

    /** True when most letters are outside Latin script, so keyword rules are unlikely to understand the text. */
    static boolean mostlyNonLatin(String text) {
        long letters = text.chars().filter(Character::isLetter).count();
        if (letters == 0) return false;
        long latin = text.chars().filter(c -> Character.isLetter(c) && c < 0x250).count();
        return latin * 2 < letters;
    }
}
