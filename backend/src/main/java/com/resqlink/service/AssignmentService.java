package com.resqlink.service;

import com.resqlink.core.IncidentStatus;
import com.resqlink.domain.AssignmentStatus;
import com.resqlink.domain.AvailabilityStatus;
import com.resqlink.domain.Incident;
import com.resqlink.domain.IncidentAssignment;
import com.resqlink.domain.ResponderProfile;
import com.resqlink.domain.Role;
import com.resqlink.domain.User;
import com.resqlink.domain.VerificationStatus;
import com.resqlink.error.ApiException;
import com.resqlink.repo.IncidentAssignmentRepository;
import com.resqlink.repo.IncidentRepository;
import com.resqlink.repo.ResponderProfileRepository;
import com.resqlink.repo.UserRepository;
import com.resqlink.security.CurrentUser;
import com.resqlink.web.dto.Dtos.AssignRequest;
import com.resqlink.web.dto.Dtos.AssignmentDto;
import com.resqlink.web.dto.Dtos.AssignmentResultDto;
import com.resqlink.web.dto.Dtos.AssignmentStatusRequest;
import com.resqlink.web.dto.Dtos.ChannelSyncDto;
import java.time.Instant;
import java.util.EnumSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AssignmentService {
    private static final Set<AssignmentStatus> LIVE = EnumSet.of(AssignmentStatus.ASSIGNED, AssignmentStatus.ACCEPTED, AssignmentStatus.ARRIVED);

    private final IncidentRepository incidents;
    private final IncidentAssignmentRepository assignments;
    private final UserRepository users;
    private final ResponderProfileRepository profiles;
    private final IncidentService incidentService;
    private final ChatService chat;
    private final NotificationService notifications;
    private final AuditService audit;
    private final com.resqlink.live.LiveEvents live;

    public AssignmentService(IncidentRepository incidents, IncidentAssignmentRepository assignments, UserRepository users,
                             ResponderProfileRepository profiles, IncidentService incidentService, ChatService chat,
                             NotificationService notifications, AuditService audit, com.resqlink.live.LiveEvents live) {
        this.live = live;
        this.incidents = incidents;
        this.assignments = assignments;
        this.users = users;
        this.profiles = profiles;
        this.incidentService = incidentService;
        this.chat = chat;
        this.notifications = notifications;
        this.audit = audit;
    }

    /** Dispatcher assigns a responder. The dispatcher always makes the final decision. */
    @Transactional
    public AssignmentResultDto assign(User dispatcher, AssignRequest req) {
        if (!CurrentUser.isStaff(dispatcher)) throw ApiException.forbidden("Only dispatchers can assign responders");
        Incident i = incidents.findById(req.incidentId()).orElseThrow(() -> ApiException.notFound("Incident"));
        if (!i.getStatus().acceptsAssignment()) {
            throw ApiException.conflict("Incident must be verified by a dispatcher before responders can be assigned");
        }
        User responder = users.findById(req.responderId()).orElseThrow(() -> ApiException.notFound("Responder"));
        if (responder.getRole() != Role.RESPONDER) throw ApiException.badRequest("The selected user is not a responder");
        if (responder.getVerificationStatus() != VerificationStatus.VERIFIED) {
            throw ApiException.conflict("This responder account has not been verified");
        }
        ResponderProfile p = profiles.findByUserId(responder.getId()).orElseThrow(() -> ApiException.notFound("Responder profile"));
        if (p.getAvailabilityStatus() == AvailabilityStatus.OFFLINE) throw ApiException.conflict("This responder is offline");
        if (assignments.findFirstByIncidentIdAndResponderIdAndAssignmentStatusIn(i.getId(), responder.getId(), LIVE).isPresent()) {
            throw ApiException.conflict("This responder is already assigned to the incident");
        }

        IncidentAssignment a = new IncidentAssignment();
        a.setIncidentId(i.getId());
        a.setResponderId(responder.getId());
        a.setAssignedBy(dispatcher.getId());
        a.setAssignmentStatus(AssignmentStatus.ASSIGNED);
        a.setAssignedAt(Instant.now());
        a = assignments.saveAndFlush(a); // flush so the partial unique index rejects concurrent duplicates now

        if (i.getStatus() == IncidentStatus.VERIFIED) {
            incidentService.transition(i, IncidentStatus.ASSIGNED, dispatcher.getId(), "Assigned to " + responder.getFullName());
        }
        notifications.notify(responder.getId(), i.getId(), "RESPONDER_ASSIGNED", "New assignment " + i.getIncidentNumber(),
                i.getCategory() + " incident" + (i.getAddressHint() != null ? " near " + i.getAddressHint() : "") + ". Please accept or decline.");
        audit.log(dispatcher.getId(), "RESPONDER_ASSIGNED", "INCIDENT", i.getId(), "responder=" + responder.getId());

        // Channel membership is synchronised after this transaction commits, so a chat outage cannot affect the assignment.
        ChannelSyncDto sync = chat.requestSync(i, dispatcher);
        live.incident("assignment.updated", i.getId());
        AssignmentDto dto = incidentService.assignmentDtos(List.of(a), Map.of(i.getId(), i.getIncidentNumber())).get(0);
        return new AssignmentResultDto(dto, false, sync.message(), sync.syncStatus());
    }

    /** Responder (accept / decline / arrived / completed) or dispatcher (cancel) updates an assignment. */
    @Transactional
    public AssignmentDto updateStatus(User actor, Long assignmentId, AssignmentStatusRequest req) {
        IncidentAssignment a = assignments.findById(assignmentId).orElseThrow(() -> ApiException.notFound("Assignment"));
        Incident i = incidents.findById(a.getIncidentId()).orElseThrow(() -> ApiException.notFound("Incident"));
        AssignmentStatus next = req.status();
        AssignmentStatus cur = a.getAssignmentStatus();
        boolean staff = CurrentUser.isStaff(actor);
        User responder = users.findById(a.getResponderId()).orElseThrow(() -> ApiException.notFound("Responder"));

        if (staff) {
            if (next != AssignmentStatus.CANCELLED) throw ApiException.forbidden("Dispatchers can only cancel assignments");
            if (!cur.isLive()) throw ApiException.conflict("Assignment is no longer active");
        } else {
            if (!a.getResponderId().equals(actor.getId())) throw ApiException.notFound("Assignment");
            boolean ok = switch (cur) {
                case ASSIGNED -> next == AssignmentStatus.ACCEPTED || next == AssignmentStatus.DECLINED;
                case ACCEPTED -> next == AssignmentStatus.ARRIVED;
                case ARRIVED -> next == AssignmentStatus.COMPLETED;
                default -> false;
            };
            if (!ok) throw ApiException.conflict("Cannot change an assignment from " + cur + " to " + next);
        }
        String reason = req.reason() == null || req.reason().isBlank() ? null : req.reason().trim();
        if ((next == AssignmentStatus.DECLINED || next == AssignmentStatus.CANCELLED) && reason == null) {
            throw ApiException.badRequest("A reason is required");
        }

        Instant now = Instant.now();
        a.setAssignmentStatus(next);
        switch (next) {
            case ACCEPTED -> a.setAcceptedAt(now);
            case ARRIVED -> a.setArrivedAt(now);
            case COMPLETED -> a.setCompletedAt(now);
            case DECLINED, CANCELLED -> a.setDeclineReason(reason);
            default -> { }
        }
        assignments.save(a);
        long remaining = assignments.findByIncidentIdAndAssignmentStatusIn(i.getId(), LIVE).size();

        switch (next) {
            case ACCEPTED -> {
                setBusy(responder.getId(), true);
                if (i.getStatus() == IncidentStatus.ASSIGNED) incidentService.transition(i, IncidentStatus.RESPONDER_ACCEPTED, actor.getId(), responder.getFullName() + " accepted");
                notifications.notifyStaff(i.getId(), "ASSIGNMENT_ACCEPTED", responder.getFullName() + " accepted " + i.getIncidentNumber(), "The responder is on the way.");
            }
            case ARRIVED -> {
                if (i.getStatus() == IncidentStatus.ASSIGNED || i.getStatus() == IncidentStatus.RESPONDER_ACCEPTED) {
                    incidentService.transition(i, IncidentStatus.ON_SCENE, actor.getId(), responder.getFullName() + " arrived");
                }
                notifications.notifyStaff(i.getId(), "STATUS_CHANGED", responder.getFullName() + " arrived at " + i.getIncidentNumber(), "Responder is on scene.");
            }
            case COMPLETED -> {
                setBusy(responder.getId(), false);
                if (remaining == 0 && i.getStatus().canTransitionTo(IncidentStatus.RESOLVED)) {
                    incidentService.transition(i, IncidentStatus.RESOLVED, actor.getId(), "All responders completed");
                }
                notifications.notifyStaff(i.getId(), "STATUS_CHANGED", responder.getFullName() + " completed " + i.getIncidentNumber(),
                        remaining == 0 ? "Incident marked resolved." : remaining + " responder(s) still active.");
            }
            case DECLINED, CANCELLED -> {
                setBusy(responder.getId(), false);
                chat.removeResponder(i, responder);
                if (remaining == 0 && (i.getStatus() == IncidentStatus.ASSIGNED || i.getStatus() == IncidentStatus.RESPONDER_ACCEPTED)) {
                    incidentService.transition(i, IncidentStatus.VERIFIED, actor.getId(), "No active responders (" + next + "): " + reason);
                }
                if (next == AssignmentStatus.DECLINED) {
                    notifications.notifyStaff(i.getId(), "ASSIGNMENT_DECLINED", responder.getFullName() + " declined " + i.getIncidentNumber(), reason);
                } else {
                    notifications.notify(responder.getId(), i.getId(), "ASSIGNMENT_CANCELLED", "Assignment cancelled", i.getIncidentNumber() + ": " + reason);
                }
            }
            default -> { }
        }
        audit.log(actor.getId(), "ASSIGNMENT_" + next, "ASSIGNMENT", a.getId(), i.getIncidentNumber());
        live.incident("assignment.updated", i.getId());
        return incidentService.assignmentDtos(List.of(a), Map.of(i.getId(), i.getIncidentNumber())).get(0);
    }

    /** Cancels the current assignment and assigns another responder in one transaction. */
    @Transactional
    public AssignmentResultDto reassign(User dispatcher, Long assignmentId, Long newResponderId) {
        if (!CurrentUser.isStaff(dispatcher)) throw ApiException.forbidden("Only dispatchers can reassign responders");
        IncidentAssignment old = assignments.findById(assignmentId).orElseThrow(() -> ApiException.notFound("Assignment"));
        updateStatus(dispatcher, assignmentId, new AssignmentStatusRequest(AssignmentStatus.CANCELLED, "Reassigned by dispatcher"));
        Incident i = incidents.findById(old.getIncidentId()).orElseThrow(() -> ApiException.notFound("Incident"));
        if (i.getStatus() == IncidentStatus.VERIFIED || i.getStatus().acceptsAssignment()) {
            return assign(dispatcher, new AssignRequest(i.getId(), newResponderId));
        }
        throw ApiException.conflict("Incident is not in a state that accepts assignments");
    }

    @Transactional(readOnly = true)
    public List<AssignmentDto> mine(User responder) {
        List<IncidentAssignment> list = assignments.findByResponderIdOrderByAssignedAtDesc(responder.getId()).stream()
                .filter(a -> a.getAssignmentStatus() != AssignmentStatus.CANCELLED).toList();
        Map<Long, String> numbers = incidents.findAllById(list.stream().map(IncidentAssignment::getIncidentId).collect(Collectors.toSet()))
                .stream().collect(Collectors.toMap(Incident::getId, Incident::getIncidentNumber));
        return incidentService.assignmentDtos(list, numbers);
    }

    private void setBusy(Long responderId, boolean busy) {
        profiles.findByUserId(responderId).ifPresent(p -> {
            if (busy && p.getAvailabilityStatus() == AvailabilityStatus.AVAILABLE) p.setAvailabilityStatus(AvailabilityStatus.BUSY);
            if (!busy && p.getAvailabilityStatus() == AvailabilityStatus.BUSY
                    && assignments.findByResponderIdAndAssignmentStatusIn(responderId, LIVE).isEmpty()) {
                p.setAvailabilityStatus(AvailabilityStatus.AVAILABLE);
            }
            profiles.save(p);
        });
    }
}
