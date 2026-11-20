package com.resqlink.web;

import com.resqlink.domain.Role;
import com.resqlink.domain.User;
import com.resqlink.security.CurrentUser;
import com.resqlink.service.ai.AiService;
import com.resqlink.web.dto.Dtos.AnalysisDto;
import com.resqlink.web.dto.Dtos.ConversationSummaryDto;
import com.resqlink.web.dto.Dtos.ConversationSummaryRequest;
import com.resqlink.web.dto.Dtos.DuplicateMatchDto;
import com.resqlink.web.dto.Dtos.RecommendationDto;
import com.resqlink.service.IncidentService;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** AI endpoints are for dispatchers/admins. AI output is advisory and never dispatches anyone. */
@RestController
@RequestMapping("/api/v1/ai/incidents/{id}")
public class AiController {
    private final AiService ai;
    private final CurrentUser current;
    private final IncidentService incidents;
    private final com.resqlink.security.RateLimiter limiter;

    public AiController(AiService ai, CurrentUser current, IncidentService incidents, com.resqlink.security.RateLimiter limiter) {
        this.limiter = limiter;
        this.ai = ai;
        this.current = current;
        this.incidents = incidents;
    }

    /** AI calls cost money and time: limit each user per endpoint so the model cannot be abused. */
    private User staff(Long id, String endpoint, int perMinute) {
        User u = current.requireRole(Role.DISPATCHER, Role.ADMIN);
        incidents.requireAccessible(u, id);
        if (!limiter.allow("ai:" + u.getId() + ":" + endpoint, perMinute, 60)) {
            throw new com.resqlink.error.ApiException(org.springframework.http.HttpStatus.TOO_MANY_REQUESTS, "Too many AI requests. Wait a minute and try again.");
        }
        return u;
    }

    @PostMapping("/analyze")
    public AnalysisDto analyze(@PathVariable Long id) { return ai.analyzeAndStore(id, staff(id, "analyze", 10).getId()); }

    @PostMapping("/duplicates")
    public List<DuplicateMatchDto> duplicates(@PathVariable Long id) { staff(id, "duplicates", 30); return ai.duplicates(id); }

    @PostMapping("/recommendations")
    public List<RecommendationDto> recommendations(@PathVariable Long id) { staff(id, "recommendations", 30); return ai.recommendations(id); }

    @GetMapping("/summary")
    public AnalysisDto summary(@PathVariable Long id) { staff(id, "summary", 60); return ai.latest(id); }

    @PostMapping("/conversation-summary")
    public ConversationSummaryDto conversation(@PathVariable Long id, @RequestBody @Valid ConversationSummaryRequest req) {
        staff(id, "conversation", 10);
        return ai.summarise(req.messages());
    }
}
