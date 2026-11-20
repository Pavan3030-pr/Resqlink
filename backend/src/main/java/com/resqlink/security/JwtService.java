package com.resqlink.security;

import com.resqlink.config.AppProperties;
import com.resqlink.domain.User;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.Date;
import java.util.Optional;
import javax.crypto.SecretKey;
import org.springframework.stereotype.Service;

@Service
public class JwtService {
    private final SecretKey key;
    private final Duration expiry;

    public JwtService(AppProperties props) {
        String secret = props.jwt().secret();
        if (secret == null || secret.getBytes(StandardCharsets.UTF_8).length < 32) {
            throw new IllegalStateException(
                    "JWT_SECRET must be set to a random value of at least 32 characters (see .env.example)");
        }
        this.key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        this.expiry = Duration.ofHours(Math.max(1, props.jwt().expiryHours()));
    }

    public String issue(User user) {
        Instant now = Instant.now();
        return Jwts.builder()
                .subject(String.valueOf(user.getId()))
                .claim("email", user.getEmail())
                .claim("role", user.getRole().name())
                .claim("tv", user.getTokenVersion())
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plus(expiry)))
                .signWith(key)
                .compact();
    }

    /** Verified token contents. The role claim is informational only; authorisation uses the database record. */
    public record Claims(long userId, int tokenVersion) {}

    public Optional<Claims> parseClaims(String token) {
        try {
            io.jsonwebtoken.Claims c = Jwts.parser().verifyWith(key).build().parseSignedClaims(token).getPayload();
            Integer tv = c.get("tv", Integer.class);
            return Optional.of(new Claims(Long.parseLong(c.getSubject()), tv == null ? -1 : tv));
        } catch (JwtException | IllegalArgumentException e) {
            return Optional.empty();
        }
    }
}
