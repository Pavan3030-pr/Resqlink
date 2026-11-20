package com.resqlink.web;

import com.resqlink.domain.Role;
import com.resqlink.security.CurrentUser;
import com.resqlink.service.AnalyticsService;
import com.resqlink.web.dto.Dtos.CoverageDto;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/analytics")
public class AnalyticsController {
    private final AnalyticsService analytics;
    private final CurrentUser current;

    public AnalyticsController(AnalyticsService analytics, CurrentUser current) {
        this.analytics = analytics;
        this.current = current;
    }

    /** Open incidents that no available responder with a fresh location can reach within the service radius. */
    @GetMapping("/coverage")
    public CoverageDto coverage() {
        current.requireRole(Role.DISPATCHER, Role.ADMIN);
        return analytics.coverage();
    }
}
