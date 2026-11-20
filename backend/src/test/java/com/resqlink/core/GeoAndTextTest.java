package com.resqlink.core;

import static org.junit.jupiter.api.Assertions.*;

import org.junit.jupiter.api.Test;

class GeoAndTextTest {
    @Test
    void haversineKnownDistance() {
        // Hyderabad (Charminar) to Secunderabad station is roughly 9-10 km
        double d = Geo.haversineMeters(17.3616, 78.4747, 17.4338, 78.5014);
        assertTrue(d > 8000 && d < 10500, "distance " + d);
        assertEquals(0.0, Geo.haversineMeters(10, 10, 10, 10), 0.001);
    }

    @Test
    void coordinateValidation() {
        assertTrue(Geo.validLatitude(90));
        assertFalse(Geo.validLatitude(90.1));
        assertTrue(Geo.validLongitude(-180));
        assertFalse(Geo.validLongitude(181));
    }

    @Test
    void jaccard() {
        assertEquals(1.0, TextSimilarity.jaccard("fire in the market", "market fire"), 0.0001);
        assertEquals(0.0, TextSimilarity.jaccard("", "fire"), 0.0);
        assertTrue(TextSimilarity.jaccard("car crash on highway", "flooded street") < 0.1);
    }

    @Test
    void cosine() {
        assertEquals(1.0, Vectors.cosine(new double[]{1, 2, 3}, new double[]{2, 4, 6}), 1e-9);
        assertEquals(0.0, Vectors.cosine(new double[]{1, 0}, new double[]{0, 1}), 1e-9);
        assertEquals(0.0, Vectors.cosine(new double[]{1, 0}, new double[]{-1, 0}), 1e-9);
        assertEquals(0.0, Vectors.cosine(new double[]{1}, new double[]{1, 2}), 0.0);
        assertEquals(0.0, Vectors.cosine(new double[]{0, 0}, new double[]{1, 1}), 0.0);
    }
}
