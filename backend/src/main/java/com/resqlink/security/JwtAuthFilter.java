package com.resqlink.security;

import com.resqlink.domain.AccountStatus;
import com.resqlink.domain.User;
import com.resqlink.repo.UserRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.List;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * Authenticates bearer tokens against the database on every request. Role, suspension and session revocation
 * (token_version) are therefore effective immediately; stale claims in an old token grant nothing.
 */
@Component
public class JwtAuthFilter extends OncePerRequestFilter {
    private final JwtService jwt;
    private final UserRepository users;

    public JwtAuthFilter(JwtService jwt, UserRepository users) {
        this.jwt = jwt;
        this.users = users;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest req, HttpServletResponse res, FilterChain chain)
            throws ServletException, IOException {
        String header = req.getHeader("Authorization");
        if (header != null && header.startsWith("Bearer ")) {
            var claims = jwt.parseClaims(header.substring(7).trim());
            if (claims.isPresent()) {
                User u = users.findById(claims.get().userId()).orElse(null);
                if (u != null && u.getStatus() == AccountStatus.ACTIVE && u.getTokenVersion() == claims.get().tokenVersion()) {
                    authenticate(u);
                }
            }
        }
        chain.doFilter(req, res);
    }

    private void authenticate(User u) {
        var principal = new AuthUser(u.getId(), u.getEmail(), u.getRole());
        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(principal, null,
                List.of(new SimpleGrantedAuthority("ROLE_" + u.getRole().name()))));
    }
}
