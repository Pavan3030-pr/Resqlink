package com.resqlink.web;

import com.resqlink.config.AppProperties;
import com.resqlink.repo.UserRepository;
import java.util.List;
import java.util.Map;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Unauthenticated, non-sensitive facts the login page needs. Passwords are never exposed. */
@RestController
@RequestMapping("/api/v1/public")
public class PublicController {
    private static final List<String> DEMO = List.of("citizen@resqlink.demo", "dispatcher@resqlink.demo", "ambulance1@resqlink.demo",
            "ambulance2@resqlink.demo", "rescue1@resqlink.demo", "admin@resqlink.demo");
    private final AppProperties props;
    private final UserRepository users;

    public PublicController(AppProperties props, UserRepository users) {
        this.props = props;
        this.users = users;
    }

    @GetMapping("/demo-info")
    public Map<String, Object> demoInfo() {
        if (!props.demoMode()) return Map.of("demoMode", false);
        List<Map<String, String>> accounts = DEMO.stream().map(e -> users.findByEmailIgnoreCase(e).orElse(null))
                .filter(java.util.Objects::nonNull).map(u -> Map.of("role", u.getRole().name(), "email", u.getEmail(), "name", u.getFullName())).toList();
        return Map.of("demoMode", true, "accounts", accounts);
    }
}
