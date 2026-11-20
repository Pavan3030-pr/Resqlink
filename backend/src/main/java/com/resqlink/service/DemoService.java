package com.resqlink.service;

import com.resqlink.config.AppProperties;
import com.resqlink.domain.AvailabilityStatus;
import com.resqlink.domain.User;
import com.resqlink.error.ApiException;
import com.resqlink.repo.IncidentRepository;
import com.resqlink.repo.ResponderProfileRepository;
import com.resqlink.repo.UserRepository;
import com.resqlink.web.dto.Dtos.CreateIncidentRequest;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Resettable demonstration scenario for live judging (DEMO_MODE=true only). It deliberately seeds NO history or metrics:
 * it clears incident data, puts the demo responders back on duty and creates one earlier report of the road accident
 * through the real pipeline (real AI analysis, real lifecycle) so the duplicate-detection step of the demo is genuine.
 * Audit logs are never deleted (they are hash-chained); incident numbers keep increasing so chat channels never collide.
 */
@Service
public class DemoService {
    /** Simulated responder positions around central Hyderabad. */
    static final Map<String, double[]> RESPONDER_POSITIONS = Map.of(
            "ambulance1@resqlink.demo", new double[]{17.3890, 78.4800},
            "ambulance2@resqlink.demo", new double[]{17.4200, 78.4600},
            "rescue1@resqlink.demo", new double[]{17.3700, 78.5000},
            "fire1@resqlink.demo", new double[]{17.4400, 78.4500});

    private final AppProperties props;
    private final JdbcTemplate jdbc;
    private final UserRepository users;
    private final ResponderProfileRepository profiles;
    private final IncidentRepository incidents;
    private final IncidentService incidentService;
    private final AuditService audit;

    public DemoService(AppProperties props, JdbcTemplate jdbc, UserRepository users, ResponderProfileRepository profiles,
                       IncidentRepository incidents, IncidentService incidentService, AuditService audit) {
        this.props = props;
        this.jdbc = jdbc;
        this.users = users;
        this.profiles = profiles;
        this.incidents = incidents;
        this.incidentService = incidentService;
        this.audit = audit;
    }

    @Transactional
    public Map<String, Object> reset(User admin) {
        if (!props.demoMode()) throw ApiException.notFound("Demo mode");
        jdbc.update("UPDATE incidents SET duplicate_of_id = NULL");
        int removed = jdbc.update("DELETE FROM incidents"); // cascades to assignments, channels, analyses, history, notifications
        resetResponders();
        Long id = seedEarlierReport();
        audit.log(admin.getId(), "DEMO_RESET", "SYSTEM", null, removed + " incidents removed");
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("incidentsRemoved", removed);
        out.put("seededIncidentId", id);
        return out;
    }

    public void resetResponders() {
        for (var e : RESPONDER_POSITIONS.entrySet()) {
            users.findByEmailIgnoreCase(e.getKey()).flatMap(u -> profiles.findByUserId(u.getId())).ifPresent(p -> {
                p.setAvailabilityStatus(AvailabilityStatus.AVAILABLE);
                p.setShareLocation(true);
                p.setLastLatitude(e.getValue()[0]);
                p.setLastLongitude(e.getValue()[1]);
                p.setLastLocationAt(Instant.now());
                profiles.save(p);
            });
        }
    }

    /** An earlier report of the same road accident, created and analysed by the real pipeline and labelled [DEMO]. */
    public Long seedEarlierReport() {
        User citizen = users.findByEmailIgnoreCase("citizen@resqlink.demo").orElse(null);
        if (citizen == null) return null;
        var req = new CreateIncidentRequest("ACCIDENT",
                "[DEMO] Two vehicles collided near the Tank Bund flyover, one person is injured and a lane is blocked.",
                17.3856, 78.4871, Instant.now(), "Citizen Ravi (demo)", null, "Tank Bund flyover", 25, "GPS");
        Long id = incidentService.create(citizen, req, null).summary().id();
        incidents.findById(id).ifPresent(i -> i.setDemo(true));
        return id;
    }

    public boolean enabled() { return props.demoMode(); }
}
