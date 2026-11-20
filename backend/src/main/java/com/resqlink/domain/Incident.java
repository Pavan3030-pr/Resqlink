package com.resqlink.domain;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "incidents")
public class Incident {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "incident_number")
    private String incidentNumber;

    @Column(name = "reported_by")
    private Long reportedBy;

    @Enumerated(EnumType.STRING)
    @Column(name = "category")
    private com.resqlink.core.Category category;

    @Column(name = "description")
    private String description;

    @Column(name = "image_url")
    private String imageUrl;

    @Column(name = "latitude")
    private double latitude;

    @Column(name = "longitude")
    private double longitude;

    @Column(name = "address_hint")
    private String addressHint;

    @Column(name = "contact_name")
    private String contactName;

    @Column(name = "contact_phone")
    private String contactPhone;

    @Column(name = "incident_time")
    private Instant incidentTime;

    @Enumerated(EnumType.STRING)
    @Column(name = "priority")
    private com.resqlink.core.Priority priority;

    @Enumerated(EnumType.STRING)
    @Column(name = "status")
    private com.resqlink.core.IncidentStatus status;

    @Column(name = "ai_summary")
    private String aiSummary;

    @Column(name = "verified_by")
    private Long verifiedBy;

    @Column(name = "duplicate_of_id")
    private Long duplicateOfId;

    @Version
    @Column(name = "version")
    private Long version;

    @Column(name = "created_at")
    private Instant createdAt;

    @Column(name = "updated_at")
    private Instant updatedAt;

    @Column(name = "location_accuracy_m")
    private Integer locationAccuracyM;

    @Column(name = "location_source")
    private String locationSource;

    @Column(name = "demo")
    private boolean demo;

    public Incident() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getIncidentNumber() { return incidentNumber; }
    public void setIncidentNumber(String incidentNumber) { this.incidentNumber = incidentNumber; }

    public Long getReportedBy() { return reportedBy; }
    public void setReportedBy(Long reportedBy) { this.reportedBy = reportedBy; }

    public com.resqlink.core.Category getCategory() { return category; }
    public void setCategory(com.resqlink.core.Category category) { this.category = category; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public String getImageUrl() { return imageUrl; }
    public void setImageUrl(String imageUrl) { this.imageUrl = imageUrl; }

    public double getLatitude() { return latitude; }
    public void setLatitude(double latitude) { this.latitude = latitude; }

    public double getLongitude() { return longitude; }
    public void setLongitude(double longitude) { this.longitude = longitude; }

    public String getAddressHint() { return addressHint; }
    public void setAddressHint(String addressHint) { this.addressHint = addressHint; }

    public String getContactName() { return contactName; }
    public void setContactName(String contactName) { this.contactName = contactName; }

    public String getContactPhone() { return contactPhone; }
    public void setContactPhone(String contactPhone) { this.contactPhone = contactPhone; }

    public Instant getIncidentTime() { return incidentTime; }
    public void setIncidentTime(Instant incidentTime) { this.incidentTime = incidentTime; }

    public com.resqlink.core.Priority getPriority() { return priority; }
    public void setPriority(com.resqlink.core.Priority priority) { this.priority = priority; }

    public com.resqlink.core.IncidentStatus getStatus() { return status; }
    public void setStatus(com.resqlink.core.IncidentStatus status) { this.status = status; }

    public String getAiSummary() { return aiSummary; }
    public void setAiSummary(String aiSummary) { this.aiSummary = aiSummary; }

    public Long getVerifiedBy() { return verifiedBy; }
    public void setVerifiedBy(Long verifiedBy) { this.verifiedBy = verifiedBy; }

    public Long getDuplicateOfId() { return duplicateOfId; }
    public void setDuplicateOfId(Long duplicateOfId) { this.duplicateOfId = duplicateOfId; }

    public Long getVersion() { return version; }
    public void setVersion(Long version) { this.version = version; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }

    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }

    public Integer getLocationAccuracyM() { return locationAccuracyM; }
    public void setLocationAccuracyM(Integer locationAccuracyM) { this.locationAccuracyM = locationAccuracyM; }

    public String getLocationSource() { return locationSource; }
    public void setLocationSource(String locationSource) { this.locationSource = locationSource; }

    public boolean isDemo() { return demo; }
    public void setDemo(boolean demo) { this.demo = demo; }

}
