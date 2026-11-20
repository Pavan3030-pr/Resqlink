package com.resqlink.service;

import com.resqlink.domain.AssignmentStatus;
import com.resqlink.domain.AvailabilityStatus;
import com.resqlink.domain.ResponderProfile;
import com.resqlink.domain.Role;
import com.resqlink.domain.User;
import com.resqlink.domain.VerificationStatus;
import com.resqlink.error.ApiException;
import com.resqlink.core.IncidentNumbers;
import com.resqlink.repo.IncidentAssignmentRepository;
import com.resqlink.repo.ResponderProfileRepository;
import com.resqlink.repo.UserRepository;
import com.resqlink.web.dto.Dtos.AvailabilityRequest;
import com.resqlink.web.dto.Dtos.LocationRequest;
import com.resqlink.web.dto.Dtos.ResponderDto;
import java.time.Instant;
import java.util.EnumSet;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ResponderService {
    private final UserRepository users;
    private final ResponderProfileRepository profiles;
    private final IncidentAssignmentRepository assignments;
    private final com.resqlink.live.LiveEvents live;

    public ResponderService(UserRepository users, ResponderProfileRepository profiles, IncidentAssignmentRepository assignments,
                            com.resqlink.live.LiveEvents live) {
        this.live = live;
        this.users = users;
        this.profiles = profiles;
        this.assignments = assignments;
    }

    @Transactional(readOnly = true)
    public List<ResponderDto> list(boolean onlyAvailable) {
        Map<Long, Long> load = assignments.workload(EnumSet.of(AssignmentStatus.ASSIGNED, AssignmentStatus.ACCEPTED, AssignmentStatus.ARRIVED))
                .stream().collect(Collectors.toMap(w -> w.getResponderId(), w -> w.getTotal()));
        Map<Long, ResponderProfile> byUser = profiles.findAll().stream().collect(Collectors.toMap(ResponderProfile::getUserId, p -> p));
        return users.findByRole(Role.RESPONDER).stream()
                .filter(u -> u.getVerificationStatus() == VerificationStatus.VERIFIED)
                .map(u -> toDto(u, byUser.get(u.getId()), load.getOrDefault(u.getId(), 0L)))
                .filter(r -> !onlyAvailable || r.availability() == AvailabilityStatus.AVAILABLE)
                .toList();
    }

    static ResponderDto toDto(User u, ResponderProfile p, long active) {
        boolean share = p != null && p.isShareLocation();
        return new ResponderDto(u.getId(), IncidentNumbers.chatUserId(u.getId()), u.getFullName(), u.getPhone(),
                p == null ? "GENERAL" : p.getResponderType(),
                p == null ? AvailabilityStatus.OFFLINE : p.getAvailabilityStatus(), share,
                share ? p.getLastLatitude() : null, share ? p.getLastLongitude() : null,
                share ? p.getLastLocationAt() : null, active, u.getVerificationStatus());
    }

    @Transactional
    public ResponderDto setAvailability(User me, AvailabilityRequest req) {
        ResponderProfile p = profileOf(me);
        p.setAvailabilityStatus(req.availability());
        if (req.shareLocation() != null) {
            p.setShareLocation(req.shareLocation());
            if (!req.shareLocation()) { // revoking consent removes the stored position
                p.setLastLatitude(null);
                p.setLastLongitude(null);
                p.setLastLocationAt(null);
            }
        }
        if (req.availability() == AvailabilityStatus.OFFLINE) {
            p.setShareLocation(false);
            p.setLastLatitude(null);
            p.setLastLongitude(null);
            p.setLastLocationAt(null);
        }
        live.staff("responder.updated");
        return toDto(me, profiles.save(p), activeCount(me.getId()));
    }

    @Transactional
    public ResponderDto updateLocation(User me, LocationRequest req) {
        ResponderProfile p = profileOf(me);
        if (!p.isShareLocation()) throw ApiException.conflict("Location sharing is off. Enable it before sharing your position");
        p.setLastLatitude(req.latitude());
        p.setLastLongitude(req.longitude());
        p.setLastLocationAt(Instant.now());
        live.staff("responder.updated");
        return toDto(me, profiles.save(p), activeCount(me.getId()));
    }

    @Transactional(readOnly = true)
    public ResponderDto me(User me) {
        return toDto(me, profileOf(me), activeCount(me.getId()));
    }

    private ResponderProfile profileOf(User me) {
        if (me.getRole() != Role.RESPONDER) throw ApiException.forbidden("Only responders have a responder profile");
        return profiles.findByUserId(me.getId()).orElseThrow(() -> ApiException.notFound("Responder profile"));
    }

    private long activeCount(Long userId) {
        return assignments.findByResponderIdAndAssignmentStatusIn(userId,
                EnumSet.of(AssignmentStatus.ASSIGNED, AssignmentStatus.ACCEPTED, AssignmentStatus.ARRIVED)).size();
    }
}
