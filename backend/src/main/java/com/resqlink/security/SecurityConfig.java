package com.resqlink.security;

import com.resqlink.config.AppProperties;
import java.util.Arrays;
import java.util.List;
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

@Configuration
@EnableMethodSecurity
public class SecurityConfig {

    @Bean
    SecurityFilterChain chain(HttpSecurity http, JwtAuthFilter jwtFilter, RateLimitFilter rateLimit) throws Exception {
        http
                .csrf(AbstractHttpConfigurer::disable) // stateless bearer-token API, no cookies
                .cors(c -> {})
                .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .headers(h -> h
                        .contentTypeOptions(c -> {})
                        .frameOptions(f -> f.deny())
                        .contentSecurityPolicy(c -> c.policyDirectives("default-src 'none'; frame-ancestors 'none'"))
                        .referrerPolicy(r -> r.policy(
                                org.springframework.security.web.header.writers.ReferrerPolicyHeaderWriter.ReferrerPolicy.NO_REFERRER)))
                .authorizeHttpRequests(a -> a
                        // The request was already authorised on its first dispatch; async/error re-dispatches (SSE completion) must not fail.
                        .dispatcherTypeMatchers(jakarta.servlet.DispatcherType.ASYNC, jakarta.servlet.DispatcherType.ERROR).permitAll()
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/v1/public/**").permitAll()
                        .requestMatchers("/actuator/health/**", "/actuator/info").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/v1/auth/register", "/api/v1/auth/login").permitAll()
                        // Webhooks are authenticated by Nexconn signature verification inside the controller.
                        .requestMatchers(HttpMethod.POST, "/api/v1/webhooks/nexconn").permitAll()
                        .requestMatchers("/api/v1/admin/**").hasRole("ADMIN")
                        .requestMatchers("/api/**").authenticated()
                        .anyRequest().denyAll())
                .exceptionHandling(e -> e
                        .authenticationEntryPoint((req, res, ex) -> {
                            res.setStatus(401);
                            res.setContentType("application/json");
                            res.getWriter().write("{\"status\":401,\"error\":\"Unauthorized\",\"message\":\"Authentication required\"}");
                        })
                        .accessDeniedHandler((req, res, ex) -> {
                            res.setStatus(403);
                            res.setContentType("application/json");
                            res.getWriter().write("{\"status\":403,\"error\":\"Forbidden\",\"message\":\"You do not have permission to do this\"}");
                        }))
                .addFilterBefore(rateLimit, UsernamePasswordAuthenticationFilter.class)
                .addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class);
        return http.build();
    }

    // The filters run inside the Spring Security chain only; stop Spring Boot from also registering them globally.
    @Bean
    FilterRegistrationBean<JwtAuthFilter> jwtFilterRegistration(JwtAuthFilter f) {
        FilterRegistrationBean<JwtAuthFilter> r = new FilterRegistrationBean<>(f);
        r.setEnabled(false);
        return r;
    }

    @Bean
    FilterRegistrationBean<RateLimitFilter> rateLimitRegistration(RateLimitFilter f) {
        FilterRegistrationBean<RateLimitFilter> r = new FilterRegistrationBean<>(f);
        r.setEnabled(false);
        return r;
    }

    @Bean
    PasswordEncoder passwordEncoder() { return new BCryptPasswordEncoder(); }

    @Bean
    CorsConfigurationSource corsSource(AppProperties props) {
        CorsConfiguration cfg = new CorsConfiguration();
        // Tolerate common copy-paste slips (surrounding quotes, trailing slash) in CORS_ALLOWED_ORIGINS.
        List<String> origins = Arrays.stream(props.cors().allowedOrigins().split(","))
                .map(String::trim)
                .map(s -> s.replaceAll("^[\"']+|[\"']+$", "").replaceAll("/+$", ""))
                .filter(s -> !s.isEmpty()).toList();
        // The project's own Vercel deployments (production and previews) and local development are always allowed.
        // The API uses bearer tokens, not cookies, so this does not expose any session to another site.
        java.util.List<String> patterns = new java.util.ArrayList<>(origins);
        patterns.add("https://resqlink-*.vercel.app");
        patterns.add("http://localhost:5173");
        cfg.setAllowedOriginPatterns(patterns);
        org.slf4j.LoggerFactory.getLogger(SecurityConfig.class).info("CORS allowed origin patterns: {}", patterns);
        cfg.setAllowedMethods(List.of("GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"));
        cfg.setAllowedHeaders(List.of("Authorization", "Content-Type", "Accept", "Idempotency-Key"));
        cfg.setExposedHeaders(List.of("X-Request-ID", "Retry-After"));
        cfg.setMaxAge(3600L);
        UrlBasedCorsConfigurationSource src = new UrlBasedCorsConfigurationSource();
        src.registerCorsConfiguration("/**", cfg);
        return src;
    }
}
