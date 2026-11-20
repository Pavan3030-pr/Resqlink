package com.resqlink.service;

import com.resqlink.core.IncidentNumbers;
import com.resqlink.core.IncidentStatus;
import com.resqlink.domain.AssignmentStatus;
import com.resqlink.domain.Incident;
import com.resqlink.domain.IncidentAssignment;
import com.resqlink.domain.IncidentChannel;
import com.resqlink.domain.ResponderProfile;
import com.resqlink.domain.Role;
import com.resqlink.domain.User;
import com.resqlink.domain.VerificationStatus;
import com.resqlink.error.ApiException;
import com.resqlink.live.LiveEvents;
import com.resqlink.repo.IncidentAssignmentRepository;
import com.resqlink.repo.IncidentChannelRepository;
import com.resqlink.repo.IncidentRepository;
import com.resqlink.repo.ResponderProfileRepository;
import com.resqlink.repo.UserRepository;
import com.resqlink.security.CurrentUser;
import com.resqlink.service.nexconn.NexconnClient;
import com.resqlink.web.dto.Dtos.ChannelSyncDto;
import com.resqlink.web.dto.Dtos.ChatTokenDto;
import com.resqlink.web.dto.Dtos.ContactDto;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;

/**
 * Authorises and orchestrates Nexconn usage. Channel synchronisation is a persisted, retryable state machine
 * (PENDING → SYNCED | FAILED): the Nexconn calls run outside database transactions, so a chat outage can never
 * roll back, block or corrupt an assignment, and failures stay visible until a retry succeeds.
 */
@Service
public class ChatService {
    private static final Logger log = LoggerFactory.getLogger(ChatService.class);
    private static final List<AssignmentStatus> LIVE = List.of(AssignmentStatus.ASSIGNED, AssignmentStatus.ACCEPTED, AssignmentStatus.ARRIVED);
    static final int MAX_AUTOMATIC_ATTEMPTS = 8;

    /** Raised after commit when a channel needs (re-)synchronising. */
    public record ChannelSyncRequested(long incidentId, Long dispatcherId) {}

    private final NexconnClient nexconn;
    private final IncidentRepository incidents;
    private final IncidentChannelRepository channels;
    private final IncidentAssignmentRepository assignments;
    private final UserRepository users;
    private final ResponderProfileRepository profiles;
    private final IncidentService incidentService;
    private final AuditService audit;
    private final ApplicationEventPublisher events;
    private final LiveEvents live;
    private final TransactionTemplate tx;
    private final TransactionTemplate readTx;

    public ChatService(NexconnClient nexconn, IncidentRepository incidents, IncidentChannelRepository channels,
                       IncidentAssignmentRepository assignments, UserRepository users,
                       ResponderProfileRepository profiles, IncidentService incidentService, AuditService audit,
                       ApplicationEventPublisher events, LiveEvents live, PlatformTransactionManager tm) {
        this.nexconn = nexconn;
        this.incidents = incidents;
        this.channels = channels;
        this.assignments = assignments;
        this.users = users;
        this.profiles = profiles;
        this.incidentService = incidentService;
        this.audit = audit;
        this.events = events;
        this.live = live;
        this.tx = new TransactionTemplate(tm);
        this.readTx = new TransactionTemplate(tm);
        this.readTx.setReadOnly(true);
    }

    /** Issues a Nexconn token for the authenticated, verified user (never for anyone else). */
    public ChatTokenDto token(User user) {
        String chatId = IncidentNumbers.chatUserId(user.getId());
        String token = nexconn.issueAccessToken(chatId, user.getFullName());
        return new ChatTokenDto(nexconn.appKey(), chatId, token, user.getFullName());
    }

    /** People this user may message directly: dispatchers ↔ responders (and admins ↔ staff). */
    @Transactional(readOnly = true)
    public List<ContactDto> contacts(User me) {
        Set<Role> wanted = switch (me.getRole()) {
            case DISPATCHER, ADMIN -> Set.of(Role.RESPONDER, Role.DISPATCHER, Role.ADMIN);
            case RESPONDER -> Set.of(Role.DISPATCHER, Role.ADMIN);
            case CITIZEN -> Set.of();
        };
        if (wanted.isEmpty()) return List.of();
        List<User> list = users.findByRoleIn(wanted).stream()
                .filter(u -> !u.getId().equals(me.getId()))
                .filter(u -> u.getStatus() == com.resqlink.domain.AccountStatus.ACTIVE)
                .filter(u -> u.getRole() != Role.RESPONDER || u.getVerificationStatus() == VerificationStatus.VERIFIED)
                .toList();
        Map<Long, String> types = profiles.findByUserIdIn(list.stream().map(User::getId).toList()).stream()
                .collect(Collectors.toMap(ResponderProfile::getUserId, ResponderProfile::getResponderType));
        return list.stream().map(u -> new ContactDto(u.getId(), IncidentNumbers.chatUserId(u.getId()),
                u.getFullName(), u.getRole(), types.get(u.getId()))).toList();
    }

    // ------------------------------------------------------------------ synchronisation state machine

    /**
     * Marks the incident's channel as needing synchronisation, inside the caller's transaction (assignment, reassignment,
     * invitation). The Nexconn calls happen after that transaction commits.
     */
    @Transactional
    public ChannelSyncDto requestSync(Incident i, User dispatcher) {
        String channelId = IncidentNumbers.channelId(i.getIncidentNumber());
        IncidentChannel ch = channels.findByIncidentId(i.getId()).orElse(null);
        if (ch == null) {
            ch = new IncidentChannel();
            ch.setIncidentId(i.getId());
            ch.setNexconnChannelId(channelId);
            ch.setChannelType("GROUP");
            ch.setCreatedAt(Instant.now());
        }
        ch.setSyncStatus("PENDING");
        ch.setNextRetryAt(null);
        channels.save(ch);
        events.publishEvent(new ChannelSyncRequested(i.getId(), dispatcher == null ? null : dispatcher.getId()));
        live.incident("channel.updated", i.getId());
        return new ChannelSyncDto(channelId, false, "Chat channel is being set up", List.of(), "PENDING");
    }

    /** Manual (re)sync from the dispatcher UI. Runs now and reports the real outcome. */
    public ChannelSyncDto ensureIncidentChannel(User actor, Long incidentId) {
        if (!CurrentUser.isStaff(actor)) throw ApiException.forbidden("Only dispatchers can manage incident channels");
        Incident i = incidents.findById(incidentId).orElseThrow(() -> ApiException.notFound("Incident"));
        if (!i.getStatus().isActive() && i.getStatus() != IncidentStatus.RESOLVED) {
            throw ApiException.conflict("This incident is closed; a new channel cannot be created");
        }
        tx.executeWithoutResult(st -> markPending(i, actor));
        ChannelSyncDto r = runSync(incidentId, actor.getId());
        audit.log(actor.getId(), "CHANNEL_SYNC", "INCIDENT", incidentId, r.syncStatus());
        return r;
    }

    private void markPending(Incident i, User actor) {
        IncidentChannel ch = channels.findByIncidentId(i.getId()).orElseGet(() -> {
            IncidentChannel n = new IncidentChannel();
            n.setIncidentId(i.getId());
            n.setNexconnChannelId(IncidentNumbers.channelId(i.getIncidentNumber()));
            n.setChannelType("GROUP");
            n.setCreatedAt(Instant.now());
            return n;
        });
        ch.setSyncStatus("PENDING");
        ch.setSyncAttempts(0);
        ch.setNextRetryAt(null);
        channels.save(ch);
    }

    private record Member(String chatId, String name) {}

    private record Plan(String channelId, String incidentNumber, String ownerChatId, List<Member> members) {}

    /**
     * Performs the Nexconn calls (no database transaction is open) and records the outcome.
     * Safe to call repeatedly: token issue, group create (409 tolerated) and join are idempotent.
     */
    public ChannelSyncDto runSync(long incidentId, Long dispatcherId) {
        Plan plan;
        try {
            plan = readTx.execute(st -> plan(incidentId, dispatcherId));
        } catch (RuntimeException e) {
            return record(incidentId, "FAILED", "Could not prepare channel members", List.of());
        }
        if (plan == null) return record(incidentId, "FAILED", "Incident or dispatcher not found", List.of());
        try {
            if (!nexconn.configured()) throw ApiException.unavailable("Chat service is not configured on the server");
            List<String> ids = new ArrayList<>();
            for (Member m : plan.members()) {
                nexconn.issueAccessToken(m.chatId(), m.name()); // every member must exist in Nexconn before joining a group
                ids.add(m.chatId());
            }
            nexconn.createGroup(plan.channelId(), "Incident " + plan.incidentNumber(), plan.ownerChatId(), ids);
            nexconn.joinGroup(plan.channelId(), ids);
            return record(incidentId, "SYNCED", null, ids);
        } catch (RuntimeException e) {
            String msg = e instanceof ApiException ? e.getMessage() : "Unexpected chat error (" + e.getClass().getSimpleName() + ")";
            log.warn("Channel sync failed for incident {}: {}", incidentId, msg);
            return record(incidentId, "FAILED", msg, List.of());
        }
    }

    private Plan plan(long incidentId, Long dispatcherId) {
        Incident i = incidents.findById(incidentId).orElse(null);
        if (i == null) return null;
        List<IncidentAssignment> live = assignments.findByIncidentIdAndAssignmentStatusIn(i.getId(), LIVE);
        Long ownerId = dispatcherId != null ? dispatcherId : i.getVerifiedBy() != null ? i.getVerifiedBy()
                : live.stream().map(IncidentAssignment::getAssignedBy).findFirst().orElse(null);
        if (ownerId == null) return null;
        User owner = users.findById(ownerId).orElse(null);
        if (owner == null) return null;
        Map<Long, User> members = new LinkedHashMap<>();
        members.put(owner.getId(), owner);
        if (i.getVerifiedBy() != null) users.findById(i.getVerifiedBy()).ifPresent(u -> members.put(u.getId(), u));
        users.findAllById(live.stream().map(IncidentAssignment::getResponderId).toList()).forEach(u -> members.put(u.getId(), u));
        IncidentChannel ch = channels.findByIncidentId(i.getId()).orElse(null);
        if (ch != null && ch.isReporterInvited()) users.findById(i.getReportedBy()).ifPresent(u -> members.put(u.getId(), u));
        List<Member> list = members.values().stream()
                .filter(u -> u.getStatus() == com.resqlink.domain.AccountStatus.ACTIVE)
                .map(u -> new Member(IncidentNumbers.chatUserId(u.getId()), u.getFullName())).toList();
        return new Plan(IncidentNumbers.channelId(i.getIncidentNumber()), i.getIncidentNumber(), IncidentNumbers.chatUserId(owner.getId()), list);
    }

    private ChannelSyncDto record(long incidentId, String status, String error, List<String> members) {
        String channelId = tx.execute(st -> {
            IncidentChannel ch = channels.findByIncidentId(incidentId).orElse(null);
            if (ch == null) return null;
            if ("SYNCED".equals(status)) {
                ch.setSyncStatus("SYNCED");
                ch.setSyncAttempts(0);
                ch.setLastSyncError(null);
                ch.setLastSyncedAt(Instant.now());
                ch.setNextRetryAt(null);
            } else {
                int attempts = ch.getSyncAttempts() + 1;
                ch.setSyncStatus("FAILED");
                ch.setSyncAttempts(attempts);
                ch.setLastSyncError(error == null ? null : error.length() > 290 ? error.substring(0, 290) : error);
                // Exponential backoff: 10 s, 20 s, 40 s … capped at 5 minutes; after MAX attempts only a manual retry continues.
                ch.setNextRetryAt(attempts >= MAX_AUTOMATIC_ATTEMPTS ? null
                        : Instant.now().plus(Duration.ofSeconds(Math.min(300, 10L << Math.min(attempts - 1, 5)))));
            }
            return ch.getNexconnChannelId();
        });
        live.incident("channel.updated", incidentId);
        boolean ok = "SYNCED".equals(status);
        return new ChannelSyncDto(channelId, ok, ok ? "Channel ready" : error, members, status);
    }

    /** Retry worker: picks up PENDING or FAILED channels whose backoff has elapsed. */
    @org.springframework.scheduling.annotation.Scheduled(fixedDelay = 15_000, initialDelay = 30_000)
    public void retryDue() {
        if (!nexconn.configured()) return;
        List<IncidentChannel> due = readTx.execute(st ->
                channels.findBySyncStatusInAndNextRetryAtBefore(List.of("PENDING", "FAILED"), Instant.now()));
        if (due == null) return;
        for (IncidentChannel ch : due) {
            try {
                runSync(ch.getIncidentId(), null);
            } catch (RuntimeException e) {
                log.warn("Retry of channel sync for incident {} failed unexpectedly", ch.getIncidentId());
            }
        }
    }

    /** Removes a responder from the channel when they decline or are reassigned (retried a few times inline). */
    public void removeResponder(Incident i, User responder) {
        IncidentChannel ch = channels.findByIncidentId(i.getId()).orElse(null);
        if (ch == null || !nexconn.configured()) return;
        for (int attempt = 1; attempt <= 3; attempt++) {
            try {
                nexconn.leaveGroup(ch.getNexconnChannelId(), List.of(IncidentNumbers.chatUserId(responder.getId())));
                return;
            } catch (RuntimeException e) {
                log.warn("Could not remove user {} from {} (attempt {}): {}", responder.getId(), ch.getNexconnChannelId(), attempt, e.getMessage());
            }
        }
        // Nexconn still lists this user as a member. Surface it so a dispatcher can see and re-sync.
        tx.executeWithoutResult(st -> channels.findByIncidentId(i.getId()).ifPresent(c ->
                c.setLastSyncError("A removed responder could not be taken out of the chat channel; open the channel and sync again.")));
    }

    /** Lets the dispatcher invite the original reporter into the incident channel. */
    public ChannelSyncDto inviteReporter(User actor, Long incidentId) {
        if (!CurrentUser.isStaff(actor)) throw ApiException.forbidden("Only dispatchers can invite reporters");
        ChannelSyncDto first = ensureIncidentChannel(actor, incidentId);
        tx.executeWithoutResult(st -> channels.findByIncidentId(incidentId).ifPresent(c -> c.setReporterInvited(true)));
        ChannelSyncDto r = runSync(incidentId, actor.getId());
        audit.log(actor.getId(), "CHANNEL_INVITE_REPORTER", "INCIDENT", incidentId, first.channelId());
        return r;
    }

    /** Channel info for a user, only if they are authorised for that incident's channel. */
    @Transactional(readOnly = true)
    public String channelFor(User u, Long incidentId) {
        Incident i = incidentService.requireAccessible(u, incidentId);
        IncidentChannel ch = channels.findByIncidentId(i.getId()).orElseThrow(() -> ApiException.notFound("Channel"));
        if (u.getRole() == Role.CITIZEN && !ch.isReporterInvited()) throw ApiException.forbidden("You have not been invited to this channel");
        return ch.getNexconnChannelId();
    }
}
