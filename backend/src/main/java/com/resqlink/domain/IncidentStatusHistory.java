package com.resqlink.domain;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "incident_status_history")
public class IncidentStatusHistory {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "incident_id")
    private Long incidentId;

    @Enumerated(EnumType.STRING)
    @Column(name = "previous_status")
    private com.resqlink.core.IncidentStatus previousStatus;

    @Enumerated(EnumType.STRING)
    @Column(name = "new_status")
    private com.resqlink.core.IncidentStatus newStatus;

    @Column(name = "changed_by")
    private Long changedBy;

    @Column(name = "reason")
    private String reason;

    @Column(name = "created_at")
    private Instant createdAt;

    public IncidentStatusHistory() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getIncidentId() { return incidentId; }
    public void setIncidentId(Long incidentId) { this.incidentId = incidentId; }

    public com.resqlink.core.IncidentStatus getPreviousStatus() { return previousStatus; }
    public void setPreviousStatus(com.resqlink.core.IncidentStatus previousStatus) { this.previousStatus = previousStatus; }

    public com.resqlink.core.IncidentStatus getNewStatus() { return newStatus; }
    public void setNewStatus(com.resqlink.core.IncidentStatus newStatus) { this.newStatus = newStatus; }

    public Long getChangedBy() { return changedBy; }
    public void setChangedBy(Long changedBy) { this.changedBy = changedBy; }

    public String getReason() { return reason; }
    public void setReason(String reason) { this.reason = reason; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }

}
