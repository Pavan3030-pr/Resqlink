package com.resqlink.service;

import com.resqlink.core.Category;
import com.resqlink.core.Geo;
import com.resqlink.core.IncidentNumbers;
import com.resqlink.core.IncidentStatus;
import com.resqlink.core.Priority;
import com.resqlink.domain.AssignmentStatus;
import com.resqlink.domain.Incident;
import com.resqlink.domain.IncidentAiAnalysis;
import com.resqlink.domain.IncidentAssignment;
import com.resqlink.domain.IncidentChannel;
import com.resqlink.domain.IncidentStatusHistory;
import com.resqlink.domain.ResponderProfile;
import com.resqlink.domain.Role;
import com.resqlink.domain.User;
import com.resqlink.error.ApiException;
import com.resqlink.repo.IncidentAiAnalysisRepository;
import com.resqlink.repo.IncidentAssignmentRepository;
import com.resqlink.repo.IncidentChannelRepository;
import com.resqlink.repo.IncidentRepository;
import com.resqlink.repo.IncidentStatusHistoryRepository;
import com.resqlink.repo.ResponderProfileRepository;
import com.resqlink.repo.UserRepository;
import com.resqlink.security.CurrentUser;
import com.resqlink.web.dto.Dtos.AnalysisDto;
import com.resqlink.web.dto.Dtos.AssignmentDto;
import com.resqlink.web.dto.Dtos.ChannelDto;
import com.resqlink.web.dto.Dtos.CreateIncidentRequest;
import com.resqlink.web.dto.Dtos.HistoryDto;
import com.resqlink.web.dto.Dtos.IncidentDetailDto;
import com.resqlink.web.dto.Dtos.IncidentSummaryDto;
import com.resqlink.web.dto.Dtos.MapMarkerDto;
import com.resqlink.web.dto.Dtos.PageDto;
import com.resqlink.web.dto.Dtos.StatsDto;
import com.resqlink.web.dto.Dtos.StatusChangeRequest;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;
import jakarta.persistence.criteria.Subquery;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.EnumSet;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

@Service
public class IncidentService {
    private static final Set<AssignmentStatus> VISIBLE_ASSIGNMENT =
            EnumSet.of(AssignmentStatus.ASSIGNED, AssignmentStatus.ACCEPTED, AssignmentStatus.ARRIVED, AssignmentStatus.COMPLETED);
    private static final Set<IncidentStatus> STAFF_SETTABLE = EnumSet.of(
            IncidentStatus.AWAITING_VERIFICATION, IncidentStatus.VERIFIED, IncidentStatus.REJECTED,
            IncidentStatus.DUPLICATE, IncidentStatus.RESOLVED, IncidentStatus.CLOSED);

    private final IncidentRepository incidents;
    private final IncidentAssignmentRepository assignments;
    private final IncidentChannelRepository channels;
    private final IncidentAiAnalysisRepository analyses;
    private final IncidentStatusHistoryRepository history;
    private final UserRepository users;
    private final ResponderProfileRepository profiles;
    private final FileStorageService files;
    private final NotificationService notifications;
    private final AuditService audit;
    private final ApplicationEventPublisher events;
    private final com.resqlink.live.LiveEvents live;

    public IncidentService(IncidentRepository incidents, IncidentAssignmentRepository assignments,
                           IncidentChannelRepository channels, IncidentAiAnalysisRepository analyses,
                           IncidentStatusHistoryRepository history, UserRepository users,
                           ResponderProfileRepository profiles, FileStorageService files,
                           NotificationService notifications, AuditService audit, ApplicationEventPublisher events,
                           com.resqlink.live.LiveEvents live) {
        this.live = live;
        this.incidents = incidents;
        this.assignments = assignments;
        this.channels = channels;
        this.analyses = analyses;
        this.history = history;
        this.users = users;
        this.profiles = profiles;
        this.files = files;
        this.notifications = notifications;
        this.audit = audit;
        this.events = events;
    }

    // ------------------------------------------------------------------ create

    @Transactional
    public IncidentDetailDto create(User reporter, CreateIncidentRequest req, MultipartFile image) {
        if (reporter.getRole() == Role.RESPONDER) throw ApiException.forbidden("Responders cannot submit citizen reports");
        Category category;
        try {
            category = Category.parse(req.category());
        } catch (IllegalArgumentException e) {
            throw ApiException.badRequest(e.getMessage());
        }
        if (!Geo.validLatitude(req.latitude()) || !Geo.validLongitude(req.longitude())) {
            throw ApiException.badRequest("Invalid GPS coordinates");
        }
        Instant now = Instant.now();
        Instant when = req.incidentTime() == null ? now : req.incidentTime();
        if (when.isAfter(now.plus(Duration.ofMinutes(5)))) throw ApiException.badRequest("Incident time cannot be in the future");
        if (when.isBefore(now.minus(Duration.ofDays(2)))) throw ApiException.badRequest("Incident time is too far in the past");

        String imageUrl = (image == null || image.isEmpty()) ? null : files.store(image);

        Incident i = new Incident();
        i.setIncidentNumber(IncidentNumbers.format(incidents.nextNumberSequence()));
        i.setReportedBy(reporter.getId());
        i.setCategory(category);
        i.setDescription(req.description().trim());
        i.setImageUrl(imageUrl);
        i.setLatitude(req.latitude());
        i.setLongitude(req.longitude());
        i.setAddressHint(blankToNull(req.addressHint()));
        i.setContactName(blankToNull(req.contactName()) != null ? req.contactName().trim() : reporter.getFullName());
        i.setContactPhone(blankToNull(req.contactPhone()) != null ? req.contactPhone().trim() : reporter.getPhone());
        i.setIncidentTime(when);
        i.setLocationAccuracyM(req.locationAccuracyMeters());
        i.setLocationSource(req.locationSource());
        i.setStatus(IncidentStatus.REPORTED);
        i.setCreatedAt(now);
        i.setUpdatedAt(now);
        i = incidents.save(i);
        recordHistory(i.getId(), null, IncidentStatus.REPORTED, reporter.getId(), "Report submitted");

        notifications.notify(reporter.getId(), i.getId(), "REPORT_SUBMITTED", "Report submitted",
                "Your report " + i.getIncidentNumber() + " was received. A dispatcher will review it.");
        notifications.notifyStaff(i.getId(), "NEW_INCIDENT", "New incident " + i.getIncidentNumber(),
                category + " reported" + (i.getAddressHint() != null ? " near " + i.getAddressHint() : "") + ".");
        audit.log(reporter.getId(), "INCIDENT_CREATED", "INCIDENT", i.getId(), i.getIncidentNumber());
        events.publishEvent(new IncidentCreatedEvent(i.getId()));
        live.incident("incident.created", i.getId());
        return detail(reporter, i.getId());
    }

    // ------------------------------------------------------------------ access

    public boolean canAccess(User u, Incident i) {
        if (CurrentUser.isStaff(u)) return true;
        if (u.getRole() == Role.CITIZEN) return i.getReportedBy().equals(u.getId());
        if (u.getRole() == Role.RESPONDER) {
            return assignments.findByIncidentIdOrderByAssignedAtAsc(i.getId()).stream()
                    .anyMatch(a -> a.getResponderId().equals(u.getId()) && VISIBLE_ASSIGNMENT.contains(a.getAssignmentStatus()));
        }
        return false;
    }

    public Incident requireAccessible(User u, Long id) {
        Incident i = incidents.findById(id).orElseThrow(() -> ApiException.notFound("Incident"));
        // Deliberately the same response for "missing" and "not yours" to avoid leaking incident ids.
        if (!canAccess(u, i)) throw ApiException.notFound("Incident");
        return i;
    }

    // ------------------------------------------------------------------ queries

    public record Filter(IncidentStatus status, Priority priority, Category category, Long assignedTo,
                         Instant from, Instant to, String q, Boolean unassigned, Boolean activeOnly) {}

    private Specification<Incident> scope(User u, Filter f) {
        return (root, query, cb) -> {
            List<Predicate> ps = new ArrayList<>();
            if (u.getRole() == Role.CITIZEN) {
                ps.add(cb.equal(root.get("reportedBy"), u.getId()));
            } else if (u.getRole() == Role.RESPONDER) {
                ps.add(cb.exists(assignmentExists(root, query.subquery(Long.class), cb, u.getId())));
            } else if (!CurrentUser.isStaff(u)) {
                ps.add(cb.disjunction());
            }
            if (f.status() != null) ps.add(cb.equal(root.get("status"), f.status()));
            if (f.priority() != null) ps.add(cb.equal(root.get("priority"), f.priority()));
            if (f.category() != null) ps.add(cb.equal(root.get("category"), f.category()));
            if (f.from() != null) ps.add(cb.greaterThanOrEqualTo(root.get("createdAt"), f.from()));
            if (f.to() != null) ps.add(cb.lessThanOrEqualTo(root.get("createdAt"), f.to()));
            if (f.q() != null && !f.q().isBlank()) {
                String like = "%" + f.q().trim().toLowerCase().replace("%", "").replace("_", "") + "%";
                ps.add(cb.or(cb.like(cb.lower(root.get("description")), like),
                        cb.like(cb.lower(root.get("incidentNumber")), like)));
            }
            if (f.assignedTo() != null && CurrentUser.isStaff(u)) {
                ps.add(cb.exists(assignmentExists(root, query.subquery(Long.class), cb, f.assignedTo())));
            }
            if (Boolean.TRUE.equals(f.activeOnly())) {
                ps.add(root.get("status").in(List.of(IncidentStatus.CLOSED, IncidentStatus.REJECTED,
                        IncidentStatus.DUPLICATE, IncidentStatus.RESOLVED)).not());
            }
            if (Boolean.TRUE.equals(f.unassigned()) && CurrentUser.isStaff(u)) {
                Subquery<Long> sq = query.subquery(Long.class);
                Root<IncidentAssignment> a = sq.from(IncidentAssignment.class);
                sq.select(a.get("id")).where(cb.equal(a.get("incidentId"), root.get("id")),
                        a.get("assignmentStatus").in(List.of(AssignmentStatus.ASSIGNED, AssignmentStatus.ACCEPTED,
                                AssignmentStatus.ARRIVED)));
                ps.add(cb.not(cb.exists(sq)));
            }
            return cb.and(ps.toArray(new Predicate[0]));
        };
    }

    private Subquery<Long> assignmentExists(Root<Incident> root, Subquery<Long> sq,
                                            jakarta.persistence.criteria.CriteriaBuilder cb, Long responderId) {
        Root<IncidentAssignment> a = sq.from(IncidentAssignment.class);
        sq.select(a.get("id")).where(cb.equal(a.get("incidentId"), root.get("id")),
                cb.equal(a.get("responderId"), responderId),
                a.get("assignmentStatus").in(List.copyOf(VISIBLE_ASSIGNMENT)));
        return sq;
    }

    @Transactional(readOnly = true)
    public PageDto<IncidentSummaryDto> list(User u, Filter f, int page, int size, String sort) {
        int safeSize = Math.min(Math.max(size, 1), 100);
        String sortField = "updatedAt".equals(sort) ? "updatedAt" : "createdAt";
        Page<Incident> p = incidents.findAll(scope(u, f),
                PageRequest.of(Math.max(page, 0), safeSize, Sort.by(Sort.Direction.DESC, sortField)));
        List<IncidentSummaryDto> items = toSummaries(p.getContent());
        return new PageDto<>(items, p.getNumber(), p.getSize(), p.getTotalElements(), p.getTotalPages());
    }

    @Transactional(readOnly = true)
    public List<MapMarkerDto> map(User u, Filter f) {
        Page<Incident> p = incidents.findAll(scope(u, f), PageRequest.of(0, 1000, Sort.by(Sort.Direction.DESC, "createdAt")));
        List<Long> ids = p.getContent().stream().map(Incident::getId).toList();
        Set<Long> assigned = assignments.findByIncidentIdIn(ids).stream()
                .filter(a -> a.getAssignmentStatus().isLive()).map(IncidentAssignment::getIncidentId).collect(Collectors.toSet());
        return p.getContent().stream().map(i -> new MapMarkerDto(i.getId(), i.getIncidentNumber(), i.getCategory(),
                i.getPriority(), i.getStatus(), i.getLatitude(), i.getLongitude(), assigned.contains(i.getId()),
                i.getCreatedAt(), truncate(i.getDescription(), 160))).toList();
    }

    @Transactional(readOnly = true)
    public IncidentDetailDto detail(User u, Long id) {
        Incident i = requireAccessible(u, id);
        List<IncidentSummaryDto> summary = toSummaries(List.of(i));
        User reporter = users.findById(i.getReportedBy()).orElse(null);
        AnalysisDto analysis = analyses.findFirstByIncidentIdOrderByCreatedAtDesc(i.getId()).map(IncidentService::toAnalysisDto).orElse(null);

        List<AssignmentDto> as = assignmentDtos(assignments.findByIncidentIdOrderByAssignedAtAsc(i.getId()), Map.of(i.getId(), i.getIncidentNumber()));
        if (u.getRole() == Role.CITIZEN) as = List.of(); // reporters see status, not responder details

        List<IncidentStatusHistory> hs = history.findByIncidentIdOrderByCreatedAtAsc(i.getId());
        Map<Long, String> names = users.findAllById(hs.stream().map(IncidentStatusHistory::getChangedBy)
                .filter(java.util.Objects::nonNull).collect(Collectors.toSet())).stream()
                .collect(Collectors.toMap(User::getId, User::getFullName));
        boolean staff = CurrentUser.isStaff(u);
        boolean citizen = u.getRole() == Role.CITIZEN;
        // Reporters see the progress of their report, not internal staff names or dispatcher notes.
        List<HistoryDto> hd = hs.stream().map(h -> new HistoryDto(h.getPreviousStatus(), h.getNewStatus(),
                citizen ? "Response team" : h.getChangedBy() == null ? "System" : names.getOrDefault(h.getChangedBy(), "Unknown"),
                citizen ? null : h.getReason(), h.getCreatedAt())).toList();

        IncidentChannel ch = channels.findByIncidentId(i.getId()).orElse(null);
        ChannelDto channel = null;
        if (ch != null && (staff || u.getRole() == Role.RESPONDER || ch.isReporterInvited())) {
            channel = new ChannelDto(ch.getNexconnChannelId(), ch.isReporterInvited(), ch.getLastMessageAt(), ch.getMessageCount(),
                    ch.getSyncStatus(), staff ? ch.getLastSyncError() : null, ch.getLastSyncedAt());
        }
        return new IncidentDetailDto(summary.get(0), reporter == null ? null : reporter.getFullName(),
                staff ? i.getContactName() : null, staff ? i.getContactPhone() : null, i.getImageUrl(), citizen ? null : i.getAiSummary(),
                i.getIncidentTime(), staff || u.getRole() == Role.RESPONDER ? analysis : null, as, hd, channel,
                staff ? List.copyOf(i.getStatus().allowedNext()) : List.of(), i.getDuplicateOfId(),
                staff ? i.getLocationAccuracyM() : null, staff ? i.getLocationSource() : null,
                staff ? incidents.countByDuplicateOfId(i.getId()) : 0L);
    }

    List<IncidentSummaryDto> toSummaries(List<Incident> list) {
        if (list.isEmpty()) return List.of();
        List<Long> ids = list.stream().map(Incident::getId).toList();
        Map<Long, List<IncidentAssignment>> byIncident = assignments.findByIncidentIdIn(ids).stream()
                .filter(a -> a.getAssignmentStatus().isLive() || a.getAssignmentStatus() == AssignmentStatus.COMPLETED)
                .collect(Collectors.groupingBy(IncidentAssignment::getIncidentId));
        Set<Long> responderIds = byIncident.values().stream().flatMap(List::stream)
                .map(IncidentAssignment::getResponderId).collect(Collectors.toSet());
        Map<Long, String> names = users.findAllById(responderIds).stream().collect(Collectors.toMap(User::getId, User::getFullName));
        Set<Long> withChannel = channels.findByIncidentIdIn(ids).stream().map(IncidentChannel::getIncidentId).collect(Collectors.toSet());
        List<IncidentSummaryDto> out = new ArrayList<>();
        for (Incident i : list) {
            List<String> rs = byIncident.getOrDefault(i.getId(), List.of()).stream()
                    .map(a -> names.getOrDefault(a.getResponderId(), "Responder")).distinct().toList();
            boolean aiPriority = i.getPriority() != null && i.getStatus().ordinal() <= IncidentStatus.AWAITING_VERIFICATION.ordinal();
            out.add(new IncidentSummaryDto(i.getId(), i.getIncidentNumber(), i.getCategory(), i.getPriority(), i.getStatus(),
                    i.getDescription(), i.getLatitude(), i.getLongitude(), i.getCreatedAt(), i.getUpdatedAt(),
                    aiPriority, rs, withChannel.contains(i.getId()), i.getAddressHint(), i.isDemo()));
        }
        return out;
    }

    public List<AssignmentDto> assignmentDtos(List<IncidentAssignment> list, Map<Long, String> incidentNumbers) {
        Set<Long> uids = list.stream().map(IncidentAssignment::getResponderId).collect(Collectors.toSet());
        Map<Long, String> names = users.findAllById(uids).stream().collect(Collectors.toMap(User::getId, User::getFullName));
        Map<Long, String> types = profiles.findByUserIdIn(uids).stream()
                .collect(Collectors.toMap(ResponderProfile::getUserId, ResponderProfile::getResponderType));
        return list.stream().map(a -> new AssignmentDto(a.getId(), a.getIncidentId(), incidentNumbers.get(a.getIncidentId()),
                a.getResponderId(), names.getOrDefault(a.getResponderId(), "Responder"), types.get(a.getResponderId()),
                a.getAssignmentStatus(), a.getDeclineReason(), a.getAssignedAt(), a.getAcceptedAt(), a.getArrivedAt(),
                a.getCompletedAt())).toList();
    }

    static AnalysisDto toAnalysisDto(IncidentAiAnalysis a) {
        return new AnalysisDto(a.getSuggestedCategory(), a.getSuggestedPriority(), a.getConfidence(), a.getSummary(),
                a.getKeyInformation(), a.getMissingInformation(), a.getExtractedLocation(), a.getModelVersion(), a.getCreatedAt(),
                a.getProcessingStatus(), a.getFallbackReason(), a.getLatencyMs(), a.isSuspectedInjection(), a.isRedacted());
    }

    // ------------------------------------------------------------------ status changes

    /** Dispatcher/admin status change (verification, rejection, duplicate marking, closing). */
    @Transactional
    public IncidentDetailDto changeStatus(User actor, Long id, StatusChangeRequest req) {
        Incident i = incidents.findById(id).orElseThrow(() -> ApiException.notFound("Incident"));
        IncidentStatus next = req.status();
        if (!STAFF_SETTABLE.contains(next)) {
            throw ApiException.badRequest("Status " + next + " is set automatically through the assignment workflow");
        }
        if (!i.getStatus().canTransitionTo(next)) {
            throw ApiException.conflict("Cannot move an incident from " + i.getStatus() + " to " + next);
        }
        String reason = blankToNull(req.reason());
        if ((next == IncidentStatus.REJECTED || next == IncidentStatus.RESOLVED) && reason == null) {
            throw ApiException.badRequest("A reason is required for this status change");
        }
        if (next == IncidentStatus.DUPLICATE) {
            if (req.duplicateOfId() == null || req.duplicateOfId().equals(i.getId())
                    || !incidents.existsById(req.duplicateOfId())) {
                throw ApiException.badRequest("Choose the existing incident this report duplicates");
            }
            i.setDuplicateOfId(req.duplicateOfId());
        }
        if (next == IncidentStatus.VERIFIED) {
            i.setVerifiedBy(actor.getId());
            if (req.priority() != null) i.setPriority(req.priority());
            if (i.getPriority() == null) i.setPriority(Priority.MEDIUM);
        }
        if (next == IncidentStatus.RESOLVED) {
            Instant now = Instant.now();
            Set<Long> freed = new java.util.HashSet<>();
            for (IncidentAssignment a : assignments.findByIncidentIdAndAssignmentStatusIn(i.getId(),
                    List.of(AssignmentStatus.ASSIGNED, AssignmentStatus.ACCEPTED, AssignmentStatus.ARRIVED))) {
                a.setAssignmentStatus(AssignmentStatus.COMPLETED);
                a.setCompletedAt(now);
                freed.add(a.getResponderId());
            }
            releaseResponders(freed);
        }
        transition(i, next, actor.getId(), reason);
        audit.log(actor.getId(), "INCIDENT_STATUS", "INCIDENT", i.getId(), i.getStatus() + (reason == null ? "" : ": " + reason));
        return detail(actor, i.getId());
    }

    /** Responders whose last live assignment just ended go back to AVAILABLE (same rule as a responder completing). */
    private void releaseResponders(Set<Long> responderIds) {
        if (responderIds.isEmpty()) return;
        for (Long rid : responderIds) {
            profiles.findByUserId(rid).ifPresent(p -> {
                boolean stillLive = !assignments.findByResponderIdAndAssignmentStatusIn(rid,
                        List.of(AssignmentStatus.ASSIGNED, AssignmentStatus.ACCEPTED, AssignmentStatus.ARRIVED)).isEmpty();
                if (!stillLive && p.getAvailabilityStatus() == com.resqlink.domain.AvailabilityStatus.BUSY) {
                    p.setAvailabilityStatus(com.resqlink.domain.AvailabilityStatus.AVAILABLE);
                    profiles.save(p);
                }
            });
        }
        live.staff("responder.updated");
    }

    @Transactional
    public IncidentDetailDto setPriority(User actor, Long id, Priority priority) {
        Incident i = incidents.findById(id).orElseThrow(() -> ApiException.notFound("Incident"));
        if (!i.getStatus().isActive()) throw ApiException.conflict("Priority can only be changed on active incidents");
        i.setPriority(priority);
        i.setUpdatedAt(Instant.now());
        audit.log(actor.getId(), "INCIDENT_PRIORITY", "INCIDENT", i.getId(), priority.name());
        live.incident("incident.updated", i.getId());
        return detail(actor, i.getId());
    }

    /** Human override of the category (the original report text is never changed). Recorded in history and audit. */
    @Transactional
    public IncidentDetailDto overrideCategory(User actor, Long id, Category category, String reason) {
        Incident i = incidents.findById(id).orElseThrow(() -> ApiException.notFound("Incident"));
        if (!i.getStatus().isActive()) throw ApiException.conflict("Category can only be changed on active incidents");
        Category old = i.getCategory();
        if (old != category) {
            i.setCategory(category);
            i.setUpdatedAt(Instant.now());
            recordHistory(i.getId(), i.getStatus(), i.getStatus(), actor.getId(),
                    "Category changed from " + old + " to " + category + " by dispatcher" + (reason == null || reason.isBlank() ? "" : ": " + reason.trim()));
            audit.log(actor.getId(), "INCIDENT_CATEGORY_OVERRIDE", "INCIDENT", i.getId(), old + " -> " + category);
        }
        return detail(actor, i.getId());
    }

    /** Timeline and audit trail for one incident, for evidence and after-action review. */
    /** Not read-only: exporting writes an audit entry, and PostgreSQL rejects writes in a read-only transaction. */
    @Transactional
    public com.resqlink.web.dto.Dtos.IncidentExportDto export(User actor, Long id) {
        IncidentDetailDto d = detail(actor, id);
        List<Map<String, Object>> rows = audit.forResource("INCIDENT", String.valueOf(id));
        Map<Long, String> names = users.findAllById(rows.stream().map(r -> (Long) r.get("user_id")).filter(java.util.Objects::nonNull)
                .collect(Collectors.toSet())).stream().collect(Collectors.toMap(User::getId, User::getFullName));
        List<com.resqlink.web.dto.Dtos.AuditEntryDto> entries = rows.stream().map(r -> new com.resqlink.web.dto.Dtos.AuditEntryDto(
                r.get("user_id") == null ? "System" : names.getOrDefault((Long) r.get("user_id"), "User"), (String) r.get("action"),
                (String) r.get("details"), ((java.sql.Timestamp) r.get("created_at")).toInstant())).toList();
        audit.log(actor.getId(), "INCIDENT_EXPORTED", "INCIDENT", id, null);
        return new com.resqlink.web.dto.Dtos.IncidentExportDto(d, entries, Instant.now(), actor.getFullName(),
                "Chat message contents are held by Nexconn and are not part of this export.");
    }

    /** Core lifecycle transition used by every workflow. Validates against the state machine. */
    @Transactional
    public void transition(Incident i, IncidentStatus next, Long actorId, String reason) {
        IncidentStatus prev = i.getStatus();
        if (prev == next) return;
        if (!prev.canTransitionTo(next)) {
            throw ApiException.conflict("Cannot move an incident from " + prev + " to " + next);
        }
        i.setStatus(next);
        i.setUpdatedAt(Instant.now());
        incidents.save(i);
        recordHistory(i.getId(), prev, next, actorId, reason);
        notifyReporter(i, next);
        live.incident("incident.updated", i.getId());
    }

    private void notifyReporter(Incident i, IncidentStatus next) {
        String title = switch (next) {
            case VERIFIED -> "Report verified";
            case ASSIGNED -> "Responders assigned";
            case ON_SCENE -> "Responders on scene";
            case RESOLVED -> "Incident resolved";
            case CLOSED -> "Incident closed";
            case REJECTED -> "Report could not be verified";
            case DUPLICATE -> "Report merged with an existing incident";
            default -> null;
        };
        if (title == null) return;
        String type = next == IncidentStatus.VERIFIED ? "INCIDENT_VERIFIED" : "STATUS_CHANGED";
        notifications.notify(i.getReportedBy(), i.getId(), type, title, i.getIncidentNumber() + ": " + title.toLowerCase() + ".");
    }

    private void recordHistory(Long incidentId, IncidentStatus prev, IncidentStatus next, Long by, String reason) {
        IncidentStatusHistory h = new IncidentStatusHistory();
        h.setIncidentId(incidentId);
        h.setPreviousStatus(prev);
        h.setNewStatus(next);
        h.setChangedBy(by);
        h.setReason(reason);
        h.setCreatedAt(Instant.now());
        history.save(h);
    }

    // ------------------------------------------------------------------ stats

    @Transactional(readOnly = true)
    public StatsDto stats() {
        Map<String, Long> byStatus = toMap(incidents.countGroupedByStatus());
        Map<String, Long> byPriority = toMap(incidents.countGroupedByPriority());
        Map<String, Long> byCategory = toMap(incidents.countGroupedByCategory());
        long total = byStatus.values().stream().mapToLong(Long::longValue).sum();
        long active = byStatus.entrySet().stream()
                .filter(e -> IncidentStatus.valueOf(e.getKey()).isActive()).mapToLong(Map.Entry::getValue).sum();
        long unassigned = incidents.count(Specification.<Incident>where((root, q, cb) -> {
            Subquery<Long> sq = q.subquery(Long.class);
            Root<IncidentAssignment> a = sq.from(IncidentAssignment.class);
            sq.select(a.get("id")).where(cb.equal(a.get("incidentId"), root.get("id")),
                    a.get("assignmentStatus").in(List.of(AssignmentStatus.ASSIGNED, AssignmentStatus.ACCEPTED, AssignmentStatus.ARRIVED)));
            return cb.and(cb.equal(root.get("status"), IncidentStatus.VERIFIED), cb.not(cb.exists(sq)));
        }));
        long critical = incidents.count(Specification.<Incident>where((root, q, cb) -> cb.and(
                cb.equal(root.get("priority"), Priority.CRITICAL),
                root.get("status").in(List.of(IncidentStatus.CLOSED, IncidentStatus.REJECTED, IncidentStatus.DUPLICATE,
                        IncidentStatus.RESOLVED)).not())));
        List<ResponderProfile> rps = profiles.findAll();
        long avail = rps.stream().filter(p -> p.getAvailabilityStatus() == com.resqlink.domain.AvailabilityStatus.AVAILABLE).count();
        return new StatsDto(total, active, unassigned, critical, byStatus, byPriority, byCategory,
                round(incidents.avgMinutesToStatus(IncidentStatus.AWAITING_VERIFICATION.name())),
                round(incidents.avgMinutesToStatus(IncidentStatus.VERIFIED.name())),
                round(incidents.avgMinutesBetween(IncidentStatus.VERIFIED.name(), IncidentStatus.ASSIGNED.name())),
                avail, rps.size(),
                round(incidents.avgMinutesToStatus(IncidentStatus.RESOLVED.name())),
                total == 0 ? null : ratio(analyses.countAnalysedIncidents(), total),
                analyses.count() == 0 ? null : ratio(analyses.countModelAnalyses(), analyses.count()),
                completionRate(), channels.totalMessages(), incidents.countByDemoTrue());
    }

    private Double completionRate() {
        long done = assignments.countByAssignmentStatus(AssignmentStatus.COMPLETED);
        long declined = assignments.countByAssignmentStatus(AssignmentStatus.DECLINED);
        long total = done + declined + assignments.countByAssignmentStatus(AssignmentStatus.ACCEPTED)
                + assignments.countByAssignmentStatus(AssignmentStatus.ARRIVED) + assignments.countByAssignmentStatus(AssignmentStatus.ASSIGNED);
        return total == 0 ? null : ratio(done, total);
    }

    private static double ratio(long part, long whole) { return Math.round(1000.0 * part / whole) / 1000.0; }

    private static Map<String, Long> toMap(List<IncidentRepository.KeyCount> rows) {
        Map<String, Long> m = new LinkedHashMap<>();
        rows.forEach(r -> m.put(r.getLabel(), r.getTotal()));
        return m;
    }

    private static Double round(Double d) { return d == null ? null : Math.round(d * 10.0) / 10.0; }

    private static String blankToNull(String s) { return s == null || s.isBlank() ? null : s.trim(); }

    private static String truncate(String s, int n) { return s.length() <= n ? s : s.substring(0, n - 1) + "…"; }

    @SuppressWarnings("unused")
    private static <T, K> Map<K, T> indexBy(List<T> list, Function<T, K> key) {
        Map<K, T> m = new HashMap<>();
        list.forEach(t -> m.put(key.apply(t), t));
        return m;
    }
}
