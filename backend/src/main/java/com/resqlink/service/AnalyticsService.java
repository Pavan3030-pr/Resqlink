package com.resqlink.service;

import com.resqlink.core.CoverageAnalyzer;
import com.resqlink.core.IncidentStatus;
import com.resqlink.domain.AccountStatus;
import com.resqlink.domain.AvailabilityStatus;
import com.resqlink.domain.Incident;
import com.resqlink.domain.ResponderProfile;
import com.resqlink.domain.Role;
import com.resqlink.domain.User;
import com.resqlink.domain.VerificationStatus;
import com.resqlink.repo.IncidentRepository;
import com.resqlink.repo.ResponderProfileRepository;
import com.resqlink.repo.UserRepository;
import com.resqlink.web.dto.Dtos.CoverageDto;
import com.resqlink.web.dto.Dtos.CoverageGapDto;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Operational analytics derived from live data: coverage gaps between open incidents and available responders. */
@Service
public class AnalyticsService {
    public static final Duration FRESH_LOCATION = Duration.ofMinutes(15);
    private final IncidentRepository incidents;
    private final UserRepository users;
    private final ResponderProfileRepository profiles;

    public AnalyticsService(IncidentRepository incidents, UserRepository users, ResponderProfileRepository profiles) {
        this.incidents = incidents;
        this.users = users;
        this.profiles = profiles;
    }

    @Transactional(readOnly = true)
    public CoverageDto coverage() {
        Set<IncidentStatus> needing = Set.of(IncidentStatus.AWAITING_VERIFICATION, IncidentStatus.VERIFIED, IncidentStatus.AI_ANALYZED, IncidentStatus.REPORTED);
        List<Incident> open = incidents.findAll().stream().filter(i -> needing.contains(i.getStatus())).toList();
        Map<Long, User> verified = users.findByRole(Role.RESPONDER).stream()
                .filter(u -> u.getVerificationStatus() == VerificationStatus.VERIFIED && u.getStatus() == AccountStatus.ACTIVE)
                .collect(Collectors.toMap(User::getId, u -> u));
        Instant cutoff = Instant.now().minus(FRESH_LOCATION);
        List<CoverageAnalyzer.Unit> located = new ArrayList<>();
        int unlocated = 0;
        for (ResponderProfile p : profiles.findByUserIdIn(verified.keySet())) {
            if (p.getAvailabilityStatus() != AvailabilityStatus.AVAILABLE) continue;
            boolean fresh = p.isShareLocation() && p.getLastLatitude() != null && p.getLastLongitude() != null
                    && p.getLastLocationAt() != null && p.getLastLocationAt().isAfter(cutoff);
            if (fresh) located.add(new CoverageAnalyzer.Unit(p.getUserId(), p.getLastLatitude(), p.getLastLongitude()));
            else unlocated++;
        }
        List<CoverageAnalyzer.Site> sites = open.stream().map(i -> new CoverageAnalyzer.Site(i.getId(), i.getIncidentNumber(),
                i.getLatitude(), i.getLongitude(), i.getPriority())).toList();
        List<CoverageGapDto> gaps = CoverageAnalyzer.gaps(sites, located, unlocated, CoverageAnalyzer.DEFAULT_RADIUS_M).stream()
                .map(g -> new CoverageGapDto(g.incidentId(), g.number(), g.priority(), g.nearestMeters(), g.reason())).toList();
        return new CoverageDto(CoverageAnalyzer.DEFAULT_RADIUS_M / 1000.0, located.size(), unlocated, gaps);
    }
}
