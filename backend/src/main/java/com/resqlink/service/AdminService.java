package com.resqlink.service;

import com.resqlink.domain.AuditLog;
import com.resqlink.domain.Role;
import com.resqlink.domain.User;
import com.resqlink.domain.VerificationStatus;
import com.resqlink.error.ApiException;
import com.resqlink.repo.AuditLogRepository;
import com.resqlink.repo.UserRepository;
import com.resqlink.web.dto.Dtos.AuditLogDto;
import com.resqlink.web.dto.Dtos.PageDto;
import com.resqlink.web.dto.Dtos.UserDto;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AdminService {
    private final UserRepository users;
    private final AuditLogRepository auditLogs;
    private final AuditService audit;
    private final NotificationService notifications;

    public AdminService(UserRepository users, AuditLogRepository auditLogs, AuditService audit, NotificationService notifications) {
        this.users = users;
        this.auditLogs = auditLogs;
        this.audit = audit;
        this.notifications = notifications;
    }

    @Transactional(readOnly = true)
    public List<UserDto> listUsers(Role role, VerificationStatus status) {
        return users.findAll().stream()
                .filter(u -> role == null || u.getRole() == role)
                .filter(u -> status == null || u.getVerificationStatus() == status)
                .sorted((a, b) -> b.getCreatedAt().compareTo(a.getCreatedAt()))
                .map(UserMapper::toDto).toList();
    }

    @Transactional
    public UserDto setVerification(User admin, Long userId, VerificationStatus status) {
        User u = users.findById(userId).orElseThrow(() -> ApiException.notFound("User"));
        if (u.getRole() != Role.RESPONDER) throw ApiException.badRequest("Only responder accounts need verification");
        u.setVerificationStatus(status);
        audit.log(admin.getId(), "RESPONDER_VERIFICATION", "USER", u.getId(), status.name());
        notifications.notify(u.getId(), null, "VERIFICATION", "Account " + status.name().toLowerCase(),
                status == VerificationStatus.VERIFIED ? "Your responder account is verified. You can now receive assignments."
                        : "Your responder account verification status is now " + status + ".");
        return UserMapper.toDto(u);
    }

    @Transactional
    public UserDto setRole(User admin, Long userId, Role role) {
        User u = users.findById(userId).orElseThrow(() -> ApiException.notFound("User"));
        if (u.getId().equals(admin.getId())) throw ApiException.badRequest("You cannot change your own role");
        if (role == Role.RESPONDER || u.getRole() == Role.RESPONDER) {
            throw ApiException.badRequest("Responder accounts are created through responder registration");
        }
        u.setRole(role);
        u.setTokenVersion(u.getTokenVersion() + 1); // existing tokens carry the old role: revoke them
        u.setVerificationStatus(VerificationStatus.VERIFIED);
        audit.log(admin.getId(), "USER_ROLE_CHANGED", "USER", u.getId(), role.name());
        return UserMapper.toDto(u);
    }

    @Transactional(readOnly = true)
    public PageDto<AuditLogDto> auditLogs(int page, int size) {
        Page<AuditLog> p = auditLogs.findAllByOrderByCreatedAtDesc(PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), 100)));
        Map<Long, String> names = users.findAllById(p.getContent().stream().map(AuditLog::getUserId)
                .filter(java.util.Objects::nonNull).collect(Collectors.toSet())).stream()
                .collect(Collectors.toMap(User::getId, User::getFullName));
        List<AuditLogDto> items = p.getContent().stream().map(a -> new AuditLogDto(a.getId(),
                a.getUserId() == null ? "System" : names.getOrDefault(a.getUserId(), "User " + a.getUserId()),
                a.getAction(), a.getResourceType(), a.getResourceId(), a.getDetails(), a.getCreatedAt())).toList();
        return new PageDto<>(items, p.getNumber(), p.getSize(), p.getTotalElements(), p.getTotalPages());
    }

    /** Suspends or reactivates an account. Suspension revokes all existing sessions immediately. */
    @Transactional
    public UserDto setSuspended(User admin, Long userId, boolean suspended, String reason) {
        User u = users.findById(userId).orElseThrow(() -> ApiException.notFound("User"));
        if (u.getId().equals(admin.getId())) throw ApiException.badRequest("You cannot suspend your own account");
        u.setStatus(suspended ? com.resqlink.domain.AccountStatus.SUSPENDED : com.resqlink.domain.AccountStatus.ACTIVE);
        u.setTokenVersion(u.getTokenVersion() + 1);
        if (!suspended) { u.setFailedLogins(0); u.setLockedUntil(null); }
        audit.log(admin.getId(), suspended ? "USER_SUSPENDED" : "USER_REACTIVATED", "USER", u.getId(), reason);
        return UserMapper.toDto(u);
    }

    @Transactional
    public UserDto revokeSessions(User admin, Long userId) {
        User u = users.findById(userId).orElseThrow(() -> ApiException.notFound("User"));
        u.setTokenVersion(u.getTokenVersion() + 1);
        audit.log(admin.getId(), "SESSIONS_REVOKED", "USER", u.getId(), null);
        return UserMapper.toDto(u);
    }
}
