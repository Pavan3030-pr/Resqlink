package com.resqlink.domain;

public enum AssignmentStatus {
    ASSIGNED, ACCEPTED, DECLINED, ARRIVED, COMPLETED, CANCELLED;

    public boolean isLive() { return this == ASSIGNED || this == ACCEPTED || this == ARRIVED; }
}
