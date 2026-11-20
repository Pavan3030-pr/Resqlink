package com.resqlink.service;

import com.resqlink.repo.UserRepository;
import java.time.Duration;
import java.time.Instant;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

/** Per-account brute-force protection. Runs in its own transaction so a failed login still records the failure. */
@Service
public class LoginAttemptService {
    public static final int MAX_FAILURES = 5;
    public static final Duration LOCK = Duration.ofMinutes(15);
    private final UserRepository users;

    public LoginAttemptService(UserRepository users) { this.users = users; }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void recordFailure(Long userId) {
        users.findById(userId).ifPresent(u -> {
            int n = u.getFailedLogins() + 1;
            if (n >= MAX_FAILURES) {
                u.setLockedUntil(Instant.now().plus(LOCK));
                u.setFailedLogins(0);
            } else {
                u.setFailedLogins(n);
            }
        });
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void recordSuccess(Long userId) {
        users.findById(userId).ifPresent(u -> {
            u.setFailedLogins(0);
            u.setLockedUntil(null);
        });
    }
}
