package com.resqlink.core;

/** Vector helpers for embedding similarity. */
public final class Vectors {
    private Vectors() {}

    /** Cosine similarity mapped to [0,1] (negative similarity counts as 0). Returns 0 for empty or mismatched input. */
    public static double cosine(double[] a, double[] b) {
        if (a == null || b == null || a.length == 0 || a.length != b.length) return 0.0;
        double dot = 0, na = 0, nb = 0;
        for (int i = 0; i < a.length; i++) {
            dot += a[i] * b[i];
            na += a[i] * a[i];
            nb += b[i] * b[i];
        }
        if (na == 0 || nb == 0) return 0.0;
        return Math.max(0.0, Math.min(1.0, dot / (Math.sqrt(na) * Math.sqrt(nb))));
    }
}
