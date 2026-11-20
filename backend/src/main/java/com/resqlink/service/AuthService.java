package com.resqlink.service;

import com.resqlink.core.PasswordPolicy;
import com.resqlink.domain.AccountStatus;
import com.resqlink.domain.AvailabilityStatus;
import com.resqlink.domain.ResponderProfile;
import com.resqlink.domain.Role;
import com.resqlink.domain.User;
import com.resqlink.domain.VerificationStatus;
import com.resqlink.error.ApiException;
import com.resqlink.repo.ResponderProfileRepository;
import com.resqlink.repo.UserRepository;
import com.resqlink.security.JwtService;
import com.resqlink.web.dto.Dtos.AuthResponse;
import com.resqlink.web.dto.Dtos.CreateUserRequest;
import com.resqlink.web.dto.Dtos.LoginRequest;
import com.resqlink.web.dto.Dtos.RegisterRequest;
import java.time.Instant;
import java.util.Locale;
import java.util.Set;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthService {
    static final Set<String> RESPONDER_TYPES =
            Set.of("GENERAL", "AMBULANCE", "FIRE_BRIGADE", "RESCUE", "POLICE", "PARAMEDIC", "VOLUNTEER");
    // Pre-computed hash so that unknown e-mails cost the same as wrong passwords (timing-safe login).
    private final String dummyHash;

    private final UserRepository users;
    private final ResponderProfileRepository profiles;
    private final PasswordEncoder encoder;
    private final JwtService jwt;
    private final AuditService audit;
    private final LoginAttemptService attempts;

    public AuthService(UserRepository users, ResponderProfileRepository profiles, PasswordEncoder encoder,
                       JwtService jwt, AuditService audit, LoginAttemptService attempts) {
        this.attempts = attempts;
        this.users = users;
        this.profiles = profiles;
        this.encoder = encoder;
        this.jwt = jwt;
        this.audit = audit;
        this.dummyHash = encoder.encode("resqlink-dummy-password");
    }

    /** Public registration: citizens and responders only. Responders need administrator verification. */
    @Transactional
    public AuthResponse register(RegisterRequest req) {
        Role role = req.role() == null ? Role.CITIZEN : req.role();
        if (role != Role.CITIZEN && role != Role.RESPONDER) {
            throw ApiException.forbidden("Dispatcher and administrator accounts are created by an administrator");
        }
        User u = create(req.fullName(), req.email(), req.password(), req.phone(), role, req.responderType());
        audit.log(u.getId(), "USER_REGISTERED", "USER", u.getId(), "role=" + role);
        return new AuthResponse(jwt.issue(u), UserMapper.toDto(u));
    }

    @Transactional
    public User createByAdmin(Long adminId, CreateUserRequest req) {
        User u = create(req.fullName(), req.email(), req.password(), null, req.role(), req.responderType());
        if (u.getRole() == Role.RESPONDER) {
            u.setVerificationStatus(VerificationStatus.VERIFIED);
        }
        audit.log(adminId, "USER_CREATED", "USER", u.getId(), "role=" + u.getRole());
        return u;
    }

    @Transactional
    public User create(String fullName, String email, String password, String phone, Role role, String responderType) {
        var problems = PasswordPolicy.check(password, email, fullName);
        if (!problems.isEmpty()) throw ApiException.badRequest(String.join(". ", problems));
        String normalized = email.trim().toLowerCase(Locale.ROOT);
        if (users.existsByEmailIgnoreCase(normalized)) throw ApiException.conflict("An account with this e-mail already exists");
        User u = new User();
        u.setFullName(fullName.trim());
        u.setEmail(normalized);
        u.setPasswordHash(encoder.encode(password));
        u.setPhone(phone == null || phone.isBlank() ? null : phone.trim());
        u.setRole(role);
        u.setVerificationStatus(role == Role.RESPONDER ? VerificationStatus.PENDING : VerificationStatus.VERIFIED);
        u.setCreatedAt(Instant.now());
        u.setStatus(AccountStatus.ACTIVE);
        u = users.save(u);
        if (role == Role.RESPONDER) {
            ResponderProfile p = new ResponderProfile();
            p.setUserId(u.getId());
            String type = responderType == null ? "GENERAL" : responderType.trim().toUpperCase(Locale.ROOT);
            if (!RESPONDER_TYPES.contains(type)) throw ApiException.badRequest("Unknown responder type: " + responderType);
            p.setResponderType(type);
            p.setAvailabilityStatus(AvailabilityStatus.OFFLINE);
            p.setShareLocation(false);
            profiles.save(p);
        }
        return u;
    }

    /**
     * Not transactional on purpose: failed attempts are recorded in their own transaction and must survive the
     * 401 that follows. Unknown e-mails cost the same BCrypt work as wrong passwords.
     */
    public AuthResponse login(LoginRequest req) {
        User u = users.findByEmailIgnoreCase(req.email().trim()).orElse(null);
        if (u != null && u.getLockedUntil() != null && u.getLockedUntil().isAfter(Instant.now())) {
            encoder.matches(req.password(), dummyHash);
            throw new ApiException(HttpStatus.TOO_MANY_REQUESTS, "Too many failed attempts. Try again in a few minutes.");
        }
        boolean ok = encoder.matches(req.password(), u == null ? dummyHash : u.getPasswordHash()) && u != null;
        if (!ok) {
            if (u != null) attempts.recordFailure(u.getId());
            throw new ApiException(HttpStatus.UNAUTHORIZED, "Invalid e-mail or password");
        }
        if (u.getStatus() != AccountStatus.ACTIVE) {
            audit.log(u.getId(), "LOGIN_BLOCKED_SUSPENDED", "USER", u.getId(), null);
            throw new ApiException(HttpStatus.FORBIDDEN, "This account is suspended. Contact an administrator.");
        }
        attempts.recordSuccess(u.getId());
        return new AuthResponse(jwt.issue(u), UserMapper.toDto(u));
    }

    /** Revokes every token issued to the user (sign out everywhere). */
    @Transactional
    public void revokeSessions(Long userId) {
        users.findById(userId).ifPresent(u -> u.setTokenVersion(u.getTokenVersion() + 1));
        audit.log(userId, "SESSIONS_REVOKED", "USER", userId, null);
    }
}
