package com.resqlink.core;

import static org.junit.jupiter.api.Assertions.*;

import java.util.List;
import org.junit.jupiter.api.Test;

class ResponderRankerTest {
    @Test
    void prefersNearbyBestFitTypeAndSkipsUnavailable() {
        var near = new ResponderRanker.Responder(1, "Near Ambulance", "AMBULANCE", true, 17.3860, 78.4870, 0);
        var far = new ResponderRanker.Responder(2, "Far Ambulance", "AMBULANCE", true, 17.5500, 78.6000, 0);
        var busyPolice = new ResponderRanker.Responder(3, "Police", "POLICE", true, 17.3865, 78.4875, 2);
        var offline = new ResponderRanker.Responder(4, "Offline", "AMBULANCE", false, 17.3851, 78.4868, 0);
        var out = ResponderRanker.rank(Category.ACCIDENT, Priority.HIGH, 17.3850, 78.4867, List.of(far, busyPolice, offline, near), 5);
        assertEquals(3, out.size());
        assertEquals(1L, out.get(0).userId());
        assertTrue(out.stream().noneMatch(r -> r.userId() == 4L));
        assertTrue(out.get(0).score() >= out.get(1).score());
    }

    @Test
    void unknownLocationStillRankedButLower() {
        var located = new ResponderRanker.Responder(1, "A", "GENERAL", true, 17.3851, 78.4868, 0);
        var unlocated = new ResponderRanker.Responder(2, "B", "GENERAL", true, null, null, 0);
        var out = ResponderRanker.rank(Category.OTHER, Priority.LOW, 17.3850, 78.4867, List.of(unlocated, located), 5);
        assertEquals(1L, out.get(0).userId());
        assertEquals(2, out.size());
        assertNull(out.get(1).distanceMeters());
    }

    @Test
    void limitApplied() {
        var list = List.of(
                new ResponderRanker.Responder(1, "A", "GENERAL", true, 17.0, 78.0, 0),
                new ResponderRanker.Responder(2, "B", "GENERAL", true, 17.1, 78.0, 0),
                new ResponderRanker.Responder(3, "C", "GENERAL", true, 17.2, 78.0, 0));
        assertEquals(2, ResponderRanker.rank(Category.OTHER, Priority.LOW, 17.0, 78.0, list, 2).size());
    }
}
