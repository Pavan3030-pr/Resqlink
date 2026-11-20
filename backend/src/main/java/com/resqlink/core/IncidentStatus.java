package com.resqlink.core;

import java.util.EnumSet;
import java.util.Set;

/**
 * Incident lifecycle:
 * Reported → AI Analyzed → Awaiting Verification → Verified → Assigned → Responder Accepted
 * → On Scene → Resolved → Closed. Dispatchers may also reject or mark duplicates before assignment.
 */
public enum IncidentStatus {
    REPORTED, AI_ANALYZED, AWAITING_VERIFICATION, VERIFIED, ASSIGNED,
    RESPONDER_ACCEPTED, ON_SCENE, RESOLVED, CLOSED, REJECTED, DUPLICATE;

    public Set<IncidentStatus> allowedNext() {
        return switch (this) {
            case REPORTED -> EnumSet.of(AI_ANALYZED, AWAITING_VERIFICATION, VERIFIED, REJECTED, DUPLICATE);
            case AI_ANALYZED -> EnumSet.of(AWAITING_VERIFICATION, VERIFIED, REJECTED, DUPLICATE);
            case AWAITING_VERIFICATION -> EnumSet.of(VERIFIED, REJECTED, DUPLICATE);
            case VERIFIED -> EnumSet.of(ASSIGNED, REJECTED, DUPLICATE);
            // ASSIGNED may go back to VERIFIED when every responder declined or was removed.
            case ASSIGNED -> EnumSet.of(RESPONDER_ACCEPTED, VERIFIED, ON_SCENE, RESOLVED);
            case RESPONDER_ACCEPTED -> EnumSet.of(ON_SCENE, ASSIGNED, VERIFIED, RESOLVED);
            case ON_SCENE -> EnumSet.of(RESOLVED);
            case RESOLVED -> EnumSet.of(CLOSED, ON_SCENE);
            case CLOSED, REJECTED, DUPLICATE -> EnumSet.noneOf(IncidentStatus.class);
        };
    }

    public boolean canTransitionTo(IncidentStatus next) {
        return next != null && allowedNext().contains(next);
    }

    /** Incidents that still need operational attention. */
    public boolean isActive() {
        return this != CLOSED && this != REJECTED && this != DUPLICATE && this != RESOLVED;
    }

    /** Responders may only be assigned once a dispatcher has verified the report. */
    public boolean acceptsAssignment() {
        return this == VERIFIED || this == ASSIGNED || this == RESPONDER_ACCEPTED || this == ON_SCENE;
    }
}
