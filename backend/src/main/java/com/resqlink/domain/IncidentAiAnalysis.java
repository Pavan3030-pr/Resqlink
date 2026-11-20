package com.resqlink.domain;

import jakarta.persistence.*;
import java.time.Instant;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@Table(name = "incident_ai_analyses")
public class IncidentAiAnalysis {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "incident_id")
    private Long incidentId;

    @Enumerated(EnumType.STRING)
    @Column(name = "suggested_category")
    private com.resqlink.core.Category suggestedCategory;

    @Enumerated(EnumType.STRING)
    @Column(name = "suggested_priority")
    private com.resqlink.core.Priority suggestedPriority;

    @Column(name = "confidence")
    private double confidence;

    @Column(name = "summary")
    private String summary;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "key_information", columnDefinition = "jsonb")
    private java.util.List<String> keyInformation;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "missing_information", columnDefinition = "jsonb")
    private java.util.List<String> missingInformation;

    @Column(name = "extracted_location")
    private String extractedLocation;

    @Column(name = "model_version")
    private String modelVersion;

    @Column(name = "created_at")
    private Instant createdAt;

    @Column(name = "processing_status")
    private String processingStatus = "OK";

    @Column(name = "latency_ms")
    private Long latencyMs;

    @Column(name = "fallback_reason")
    private String fallbackReason;

    @Column(name = "suspected_injection")
    private boolean suspectedInjection;

    @Column(name = "redacted")
    private boolean redacted;

    @Column(name = "input_chars")
    private Integer inputChars;

    @Column(name = "output_chars")
    private Integer outputChars;

    public IncidentAiAnalysis() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getIncidentId() { return incidentId; }
    public void setIncidentId(Long incidentId) { this.incidentId = incidentId; }

    public com.resqlink.core.Category getSuggestedCategory() { return suggestedCategory; }
    public void setSuggestedCategory(com.resqlink.core.Category suggestedCategory) { this.suggestedCategory = suggestedCategory; }

    public com.resqlink.core.Priority getSuggestedPriority() { return suggestedPriority; }
    public void setSuggestedPriority(com.resqlink.core.Priority suggestedPriority) { this.suggestedPriority = suggestedPriority; }

    public double getConfidence() { return confidence; }
    public void setConfidence(double confidence) { this.confidence = confidence; }

    public String getSummary() { return summary; }
    public void setSummary(String summary) { this.summary = summary; }

    public java.util.List<String> getKeyInformation() { return keyInformation; }
    public void setKeyInformation(java.util.List<String> keyInformation) { this.keyInformation = keyInformation; }

    public java.util.List<String> getMissingInformation() { return missingInformation; }
    public void setMissingInformation(java.util.List<String> missingInformation) { this.missingInformation = missingInformation; }

    public String getExtractedLocation() { return extractedLocation; }
    public void setExtractedLocation(String extractedLocation) { this.extractedLocation = extractedLocation; }

    public String getModelVersion() { return modelVersion; }
    public void setModelVersion(String modelVersion) { this.modelVersion = modelVersion; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }

    public String getProcessingStatus() { return processingStatus; }
    public void setProcessingStatus(String processingStatus) { this.processingStatus = processingStatus; }

    public Long getLatencyMs() { return latencyMs; }
    public void setLatencyMs(Long latencyMs) { this.latencyMs = latencyMs; }

    public String getFallbackReason() { return fallbackReason; }
    public void setFallbackReason(String fallbackReason) { this.fallbackReason = fallbackReason; }

    public boolean isSuspectedInjection() { return suspectedInjection; }
    public void setSuspectedInjection(boolean suspectedInjection) { this.suspectedInjection = suspectedInjection; }

    public boolean isRedacted() { return redacted; }
    public void setRedacted(boolean redacted) { this.redacted = redacted; }

    public Integer getInputChars() { return inputChars; }
    public void setInputChars(Integer inputChars) { this.inputChars = inputChars; }

    public Integer getOutputChars() { return outputChars; }
    public void setOutputChars(Integer outputChars) { this.outputChars = outputChars; }

}
