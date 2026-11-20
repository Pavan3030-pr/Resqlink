package com.resqlink.core;

import static org.junit.jupiter.api.Assertions.*;

import org.junit.jupiter.api.Test;

class IncidentStatusTest {
    @Test
    void happyPathIsFullyConnected() {
        IncidentStatus[] path = {
                IncidentStatus.REPORTED, IncidentStatus.AI_ANALYZED, IncidentStatus.AWAITING_VERIFICATION,
                IncidentStatus.VERIFIED, IncidentStatus.ASSIGNED, IncidentStatus.RESPONDER_ACCEPTED,
                IncidentStatus.ON_SCENE, IncidentStatus.RESOLVED, IncidentStatus.CLOSED};
        for (int i = 0; i < path.length - 1; i++) {
            assertTrue(path[i].canTransitionTo(path[i + 1]), path[i] + " -> " + path[i + 1]);
        }
    }

    @Test
    void cannotSkipVerificationBeforeAssignment() {
        assertFalse(IncidentStatus.REPORTED.canTransitionTo(IncidentStatus.ASSIGNED));
        assertFalse(IncidentStatus.AWAITING_VERIFICATION.canTransitionTo(IncidentStatus.ASSIGNED));
        assertFalse(IncidentStatus.AI_ANALYZED.canTransitionTo(IncidentStatus.ON_SCENE));
    }

    @Test
    void terminalStatesAllowNothing() {
        for (IncidentStatus s : new IncidentStatus[]{IncidentStatus.CLOSED, IncidentStatus.REJECTED, IncidentStatus.DUPLICATE}) {
            assertTrue(s.allowedNext().isEmpty(), s.name());
        }
    }

    @Test
    void dispatcherCanRejectOrMarkDuplicateBeforeVerification() {
        assertTrue(IncidentStatus.AWAITING_VERIFICATION.canTransitionTo(IncidentStatus.REJECTED));
        assertTrue(IncidentStatus.AWAITING_VERIFICATION.canTransitionTo(IncidentStatus.DUPLICATE));
        assertFalse(IncidentStatus.ON_SCENE.canTransitionTo(IncidentStatus.REJECTED));
    }

    @Test
    void assignmentOnlyAfterVerification() {
        assertFalse(IncidentStatus.REPORTED.acceptsAssignment());
        assertFalse(IncidentStatus.AWAITING_VERIFICATION.acceptsAssignment());
        assertTrue(IncidentStatus.VERIFIED.acceptsAssignment());
        assertFalse(IncidentStatus.CLOSED.acceptsAssignment());
    }
}
