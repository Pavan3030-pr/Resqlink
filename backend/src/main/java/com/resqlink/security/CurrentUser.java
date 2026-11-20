package com.resqlink.security;

import com.resqlink.domain.Role;
import com.resqlink.domain.User;
import com.resqlink.domain.VerificationStatus;
import com.resqlink.error.ApiException;
import com.resqlink.repo.UserRepository;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

/** Resolves the authenticated user from the database (so role/verification changes apply immediately). */
@Component
public class CurrentUser {
    private final UserRepository users;

    public CurrentUser(UserRepository users) { this.users = users; }

    public User get() {
        Authentication a = SecurityContextHolder.getContext().getAuthentication();
        if (a == null || !(a.getPrincipal() instanceof AuthUser p)) {
            throw new ApiException(org.springframework.http.HttpStatus.UNAUTHORIZED, "Authentication required");
        }
        return users.findById(p.id())
                .filter(u -> u.getStatus() == com.resqlink.domain.AccountStatus.ACTIVE)
                .orElseThrow(() -> new ApiException(org.springframework.http.HttpStatus.UNAUTHORIZED, "Account unavailable"));
    }

    /** Operational features (assignments, chat, location) require a verified responder account. */
    public User getOperational() {
        User u = get();
        if (u.getRole() == Role.RESPONDER && u.getVerificationStatus() != VerificationStatus.VERIFIED) {
            throw ApiException.forbidden("Your responder account is awaiting verification by an administrator");
        }
        return u;
    }

    public User requireRole(Role... allowed) {
        User u = getOperational();
        for (Role r : allowed) if (u.getRole() == r) return u;
        throw ApiException.forbidden("Your role is not allowed to do this");
    }

    public static boolean isStaff(User u) { return u.getRole() == Role.DISPATCHER || u.getRole() == Role.ADMIN; }
}
