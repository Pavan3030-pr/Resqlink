package com.resqlink.core;

import java.util.HashSet;
import java.util.Locale;
import java.util.Set;

/** Token-based text similarity used for duplicate detection when embeddings are unavailable. */
public final class TextSimilarity {
    private static final Set<String> STOP = Set.of(
            "the", "a", "an", "and", "or", "of", "to", "in", "on", "at", "is", "are", "was", "were", "there",
            "this", "that", "it", "for", "with", "near", "by", "from", "has", "have", "been", "please", "help");

    private TextSimilarity() {}

    public static Set<String> tokens(String text) {
        Set<String> out = new HashSet<>();
        if (text == null) return out;
        for (String t : text.toLowerCase(Locale.ROOT).split("[^\\p{L}\\p{N}]+")) {
            if (t.length() > 2 && !STOP.contains(t)) out.add(t);
        }
        return out;
    }

    /** Jaccard similarity in [0,1]. Two empty texts are treated as 0 (no evidence). */
    public static double jaccard(String a, String b) {
        Set<String> ta = tokens(a);
        Set<String> tb = tokens(b);
        if (ta.isEmpty() || tb.isEmpty()) return 0.0;
        Set<String> inter = new HashSet<>(ta);
        inter.retainAll(tb);
        Set<String> union = new HashSet<>(ta);
        union.addAll(tb);
        return (double) inter.size() / union.size();
    }
}
