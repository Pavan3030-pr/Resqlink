package com.resqlink.domain;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "incident_channels")
public class IncidentChannel {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "incident_id")
    private Long incidentId;

    @Column(name = "nexconn_channel_id")
    private String nexconnChannelId;

    @Column(name = "channel_type")
    private String channelType;

    @Column(name = "reporter_invited")
    private boolean reporterInvited;

    @Column(name = "last_message_at")
    private Instant lastMessageAt;

    @Column(name = "message_count")
    private long messageCount;

    @Column(name = "created_at")
    private Instant createdAt;

    @Column(name = "sync_status")
    private String syncStatus = "SYNCED";

    @Column(name = "sync_attempts")
    private int syncAttempts;

    @Column(name = "last_sync_error")
    private String lastSyncError;

    @Column(name = "last_synced_at")
    private Instant lastSyncedAt;

    @Column(name = "next_retry_at")
    private Instant nextRetryAt;

    public IncidentChannel() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getIncidentId() { return incidentId; }
    public void setIncidentId(Long incidentId) { this.incidentId = incidentId; }

    public String getNexconnChannelId() { return nexconnChannelId; }
    public void setNexconnChannelId(String nexconnChannelId) { this.nexconnChannelId = nexconnChannelId; }

    public String getChannelType() { return channelType; }
    public void setChannelType(String channelType) { this.channelType = channelType; }

    public boolean isReporterInvited() { return reporterInvited; }
    public void setReporterInvited(boolean reporterInvited) { this.reporterInvited = reporterInvited; }

    public Instant getLastMessageAt() { return lastMessageAt; }
    public void setLastMessageAt(Instant lastMessageAt) { this.lastMessageAt = lastMessageAt; }

    public long getMessageCount() { return messageCount; }
    public void setMessageCount(long messageCount) { this.messageCount = messageCount; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }

    public String getSyncStatus() { return syncStatus; }
    public void setSyncStatus(String syncStatus) { this.syncStatus = syncStatus; }

    public int getSyncAttempts() { return syncAttempts; }
    public void setSyncAttempts(int syncAttempts) { this.syncAttempts = syncAttempts; }

    public String getLastSyncError() { return lastSyncError; }
    public void setLastSyncError(String lastSyncError) { this.lastSyncError = lastSyncError; }

    public Instant getLastSyncedAt() { return lastSyncedAt; }
    public void setLastSyncedAt(Instant lastSyncedAt) { this.lastSyncedAt = lastSyncedAt; }

    public Instant getNextRetryAt() { return nextRetryAt; }
    public void setNextRetryAt(Instant nextRetryAt) { this.nextRetryAt = nextRetryAt; }

}
