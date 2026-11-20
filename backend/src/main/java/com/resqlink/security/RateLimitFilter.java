package com.resqlink.security;

import com.resqlink.config.AppProperties;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

/** Per-client limits on unauthenticated abuse targets (login, registration, webhook endpoint). */
@Component
public class RateLimitFilter extends OncePerRequestFilter {
    private final RateLimiter limiter;
    private final int authLimit;

    public RateLimitFilter(RateLimiter limiter, AppProperties props) {
        this.limiter = limiter;
        this.authLimit = props.rateLimit().authPerMinute();
    }

    private int limitFor(String uri) {
        if (uri.equals("/api/v1/auth/login") || uri.equals("/api/v1/auth/register")) return authLimit;
        if (uri.equals("/api/v1/webhooks/nexconn")) return 600; // Nexconn bursts; invalid requests are cheap to reject
        return -1;
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest req) {
        return !"POST".equals(req.getMethod()) || limitFor(req.getRequestURI()) < 0;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest req, HttpServletResponse res, FilterChain chain)
            throws ServletException, IOException {
        String uri = req.getRequestURI();
        if (!limiter.allow("ip:" + req.getRemoteAddr() + ":" + uri, limitFor(uri), 60)) {
            res.setStatus(429);
            res.setHeader("Retry-After", "60");
            res.setContentType("application/json");
            res.getWriter().write("{\"status\":429,\"error\":\"Too Many Requests\",\"message\":\"Too many requests, please slow down\"}");
            return;
        }
        chain.doFilter(req, res);
    }
}
