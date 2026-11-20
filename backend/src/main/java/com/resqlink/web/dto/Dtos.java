package com.resqlink.web.dto;

import com.resqlink.core.Category;
import com.resqlink.core.IncidentStatus;
import com.resqlink.core.Priority;
import com.resqlink.domain.AssignmentStatus;
import com.resqlink.domain.AvailabilityStatus;
import com.resqlink.domain.Role;
import com.resqlink.domain.VerificationStatus;
import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.util.List;

/** Request/response records for the REST API. */
public final class Dtos {
    private Dtos() {}

    // ---- auth ----
    public record RegisterRequest(
            @NotBlank @Size(min = 2, max = 120) String fullName,
            @NotBlank @Email @Size(max = 190) String email,
            @NotBlank @Size(min = 10, max = 72) String password,
            @Size(max = 30) @Pattern(regexp = "^[0-9+()\\-\\s]*$", message = "Invalid phone number") String phone,
            Role role,
            @Size(max = 30) String responderType) {}

    public record LoginRequest(@NotBlank @Email String email, @NotBlank String password) {}

    public record UserDto(Long id, String fullName, String email, String phone, Role role,
                          VerificationStatus verificationStatus, String chatUserId, Instant createdAt,
                          com.resqlink.domain.AccountStatus status) {}

    public record AuthResponse(String token, UserDto user) {}

    public record CreateUserRequest(
            @NotBlank @Size(min = 2, max = 120) String fullName,
            @NotBlank @Email String email,
            @NotBlank @Size(min = 10, max = 72) String password,
            @NotNull Role role,
            String responderType) {}

    public record VerificationRequest(@NotNull VerificationStatus status) {}

    public record RoleRequest(@NotNull Role role) {}

    public record SuspensionRequest(@NotNull Boolean suspended, @Size(max = 300) String reason) {}

    // ---- incidents ----
    public record CreateIncidentRequest(
            @NotBlank String category,
            @NotBlank @Size(min = 10, max = 2000) String description,
            @NotNull @DecimalMin("-90.0") @DecimalMax("90.0") Double latitude,
            @NotNull @DecimalMin("-180.0") @DecimalMax("180.0") Double longitude,
            Instant incidentTime,
            @Size(max = 120) String contactName,
            @Size(max = 30) @Pattern(regexp = "^[0-9+()\\-\\s]*$", message = "Invalid phone number") String contactPhone,
            @Size(max = 250) String addressHint,
            @jakarta.validation.constraints.Min(0) @jakarta.validation.constraints.Max(100000) Integer locationAccuracyMeters,
            @Pattern(regexp = "^(GPS|MAP_PIN)$", message = "Invalid location source") String locationSource) {}

    public record IncidentSummaryDto(
            Long id, String incidentNumber, Category category, Priority priority, IncidentStatus status,
            String description, double latitude, double longitude, Instant createdAt, Instant updatedAt,
            boolean priorityIsAiSuggestion, List<String> responders, boolean hasChannel, String addressHint,
            boolean demo) {}

    public record AnalysisDto(
            Category suggestedCategory, Priority suggestedPriority, double confidence, String summary,
            List<String> keyInformation, List<String> missingInformation, String extractedLocation,
            String modelVersion, Instant createdAt, String processingStatus, String fallbackReason, Long latencyMs,
            boolean suspectedInjection, boolean redacted) {}

    public record AssignmentDto(
            Long id, Long incidentId, String incidentNumber, Long responderId, String responderName,
            String responderType, AssignmentStatus status, String declineReason,
            Instant assignedAt, Instant acceptedAt, Instant arrivedAt, Instant completedAt) {}

    public record HistoryDto(IncidentStatus previousStatus, IncidentStatus newStatus, String changedByName,
                             String reason, Instant createdAt) {}

    public record ChannelDto(String channelId, boolean reporterInvited, Instant lastMessageAt, long messageCount,
                             String syncStatus, String syncError, Instant lastSyncedAt) {}

    public record IncidentDetailDto(
            IncidentSummaryDto summary, String reportedByName, String contactName, String contactPhone,
            String imageUrl, String aiSummary, Instant incidentTime, AnalysisDto analysis,
            List<AssignmentDto> assignments, List<HistoryDto> history, ChannelDto channel,
            List<IncidentStatus> allowedNext, Long duplicateOfId, Integer locationAccuracyMeters, String locationSource,
            long duplicateCount) {}

    public record StatusChangeRequest(@NotNull IncidentStatus status, @Size(max = 400) String reason, Long duplicateOfId,
                                      Priority priority) {}

    public record PriorityRequest(@NotNull Priority priority) {}

    public record CategoryRequest(@NotNull Category category, @Size(max = 300) String reason) {}

    public record MapMarkerDto(Long id, String incidentNumber, Category category, Priority priority,
                               IncidentStatus status, double latitude, double longitude, boolean assigned,
                               Instant createdAt, String description) {}

    public record PageDto<T>(List<T> items, int page, int size, long totalElements, int totalPages) {}

    public record StatsDto(long total, long active, long unassigned, long critical,
                           java.util.Map<String, Long> byStatus, java.util.Map<String, Long> byPriority,
                           java.util.Map<String, Long> byCategory,
                           Double avgMinutesToAnalysis, Double avgMinutesToVerification,
                           Double avgMinutesVerificationToAssignment, long respondersAvailable, long respondersTotal,
                           Double avgMinutesToResolution, Double analysisCoverage, Double modelSuccessRate,
                           Double assignmentCompletionRate, long chatMessages, long demoIncidents) {}

    // ---- AI ----
    public record DuplicateMatchDto(Long incidentId, String incidentNumber, double confidence, double distanceMeters,
                                    long minutesApart, List<String> reasons, IncidentStatus status, String description,
                                    Double semanticSimilarity) {}

    public record RecommendationDto(Long responderId, String name, String responderType, double score,
                                    Double distanceMeters, List<String> reasons) {}

    public record ChatMessageInput(@NotBlank @Size(max = 120) String sender, @NotBlank @Size(max = 2000) String text, Instant sentAt) {}

    public record ConversationSummaryRequest(@NotNull @Size(min = 1, max = 200) List<@Valid ChatMessageInput> messages) {}

    public record ConversationSummaryDto(String summary, int messageCount, String source) {}

    // ---- responders & assignments ----
    public record ResponderDto(Long userId, String chatUserId, String fullName, String phone, String responderType,
                               AvailabilityStatus availability, boolean shareLocation, Double latitude, Double longitude,
                               Instant lastLocationAt, long activeAssignments, VerificationStatus verificationStatus) {}

    public record AvailabilityRequest(@NotNull AvailabilityStatus availability, Boolean shareLocation) {}

    public record LocationRequest(
            @NotNull @DecimalMin("-90.0") @DecimalMax("90.0") Double latitude,
            @NotNull @DecimalMin("-180.0") @DecimalMax("180.0") Double longitude) {}

    public record AssignRequest(@NotNull Long incidentId, @NotNull Long responderId) {}

    public record AssignmentStatusRequest(@NotNull AssignmentStatus status, @Size(max = 300) String reason) {}

    public record ReassignRequest(@NotNull Long newResponderId) {}

    public record AssignmentResultDto(AssignmentDto assignment, boolean chatSynced, String chatMessage, String chatSyncStatus) {}

    // ---- chat ----
    public record ChatTokenDto(String appKey, String userId, String token, String displayName) {}

    public record ContactDto(Long userId, String chatUserId, String fullName, Role role, String responderType) {}

    public record ChannelSyncDto(String channelId, boolean synced, String message, List<String> memberChatIds, String syncStatus) {}

    // ---- notifications ----
    public record NotificationDto(Long id, Long incidentId, String type, String title, String message,
                                  Instant createdAt, boolean read) {}

    public record AuditLogDto(Long id, String actor, String action, String resourceType, String resourceId,
                              String details, Instant createdAt) {}

    // ---- analytics, export, evaluation ----
    public record CoverageGapDto(Long incidentId, String incidentNumber, Priority priority, Double nearestMeters, String reason) {}

    public record CoverageDto(double radiusKm, long availableLocated, long availableUnlocated, List<CoverageGapDto> gaps) {}

    public record AuditEntryDto(String actor, String action, String details, Instant createdAt) {}

    public record IncidentExportDto(IncidentDetailDto incident, List<AuditEntryDto> audit, Instant exportedAt, String exportedBy,
                                    String note) {}

    public record AiEvalReportDto(String analyzer, int cases, double categoryAccuracy, double priorityAccuracy,
                                  double criticalRecall, double injectionResistance, double injectionFlagRate,
                                  double duplicatePrecision, double duplicateRecall, double medianLatencyMs, double p95LatencyMs,
                                  double fallbackRate, long approxInputTokens, long approxOutputTokens, Double approxCostUsd,
                                  List<String> failures, String note) {}
}
