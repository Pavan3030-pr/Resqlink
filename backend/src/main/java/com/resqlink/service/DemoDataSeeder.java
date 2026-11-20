package com.resqlink.service;

import com.resqlink.config.AppProperties;
import com.resqlink.domain.AvailabilityStatus;
import com.resqlink.domain.ResponderProfile;
import com.resqlink.domain.Role;
import com.resqlink.domain.User;
import com.resqlink.domain.VerificationStatus;
import com.resqlink.repo.ResponderProfileRepository;
import com.resqlink.repo.UserRepository;
import java.time.Instant;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Optional demo accounts (SEED_DEMO_DATA=true). Every seeded account is labelled "(demo)" and no incidents
 * are fabricated: the demo flow is performed live through the application.
 */
@Component
public class DemoDataSeeder implements ApplicationRunner {
    private static final Logger log = LoggerFactory.getLogger(DemoDataSeeder.class);

    private final AppProperties props;
    private final UserRepository users;
    private final ResponderProfileRepository profiles;
    private final AuthService auth;
    private final DemoService demo;

    public DemoDataSeeder(AppProperties props, UserRepository users, ResponderProfileRepository profiles, AuthService auth, DemoService demo) {
        this.demo = demo;
        this.props = props;
        this.users = users;
        this.profiles = profiles;
        this.auth = auth;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        if (!props.seedDemoData()) return;
        String pw = props.demoPassword();
        if (pw == null || pw.length() < 8) {
            throw new IllegalStateException("DEMO_PASSWORD (min 8 characters) is required when SEED_DEMO_DATA=true");
        }
        if (users.count() > 0) {
            log.info("Demo seeding skipped: users already exist");
            return;
        }
        auth.create("Admin (demo)", "admin@resqlink.demo", pw, null, Role.ADMIN, null);
        auth.create("Dispatcher Asha (demo)", "dispatcher@resqlink.demo", pw, "+910000000001", Role.DISPATCHER, null);
        auth.create("Citizen Ravi (demo)", "citizen@resqlink.demo", pw, "+910000000002", Role.CITIZEN, null);
        // Responders around central Hyderabad (simulated positions).
        responder(pw, "Ambulance Unit 1 (demo)", "ambulance1@resqlink.demo", "AMBULANCE", 17.3890, 78.4800);
        responder(pw, "Ambulance Unit 2 (demo)", "ambulance2@resqlink.demo", "AMBULANCE", 17.4200, 78.4600);
        responder(pw, "Rescue Team A (demo)", "rescue1@resqlink.demo", "RESCUE", 17.3700, 78.5000);
        responder(pw, "Fire Brigade 3 (demo)", "fire1@resqlink.demo", "FIRE_BRIGADE", 17.4400, 78.4500);
        if (props.demoMode()) demo.seedEarlierReport();
        log.info("Seeded demo accounts (all labelled '(demo)').");
    }

    private void responder(String pw, String name, String email, String type, double lat, double lng) {
        User u = auth.create(name, email, pw, null, Role.RESPONDER, type);
        u.setVerificationStatus(VerificationStatus.VERIFIED);
        users.save(u);
        ResponderProfile p = profiles.findByUserId(u.getId()).orElseThrow();
        p.setAvailabilityStatus(AvailabilityStatus.AVAILABLE);
        p.setShareLocation(true);
        p.setLastLatitude(lat);
        p.setLastLongitude(lng);
        p.setLastLocationAt(Instant.now());
        profiles.save(p);
    }
}
