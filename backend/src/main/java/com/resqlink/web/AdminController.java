package com.resqlink.web;

import com.resqlink.domain.Role;
import com.resqlink.domain.User;
import com.resqlink.domain.VerificationStatus;
import com.resqlink.security.CurrentUser;
import com.resqlink.service.AdminService;
import com.resqlink.service.AuthService;
import com.resqlink.service.UserMapper;
import com.resqlink.web.dto.Dtos.AuditLogDto;
import com.resqlink.web.dto.Dtos.CreateUserRequest;
import com.resqlink.web.dto.Dtos.PageDto;
import com.resqlink.web.dto.Dtos.RoleRequest;
import com.resqlink.web.dto.Dtos.SuspensionRequest;
import com.resqlink.web.dto.Dtos.UserDto;
import com.resqlink.web.dto.Dtos.VerificationRequest;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/admin")
public class AdminController {
    private final AdminService admin;
    private final AuthService auth;
    private final CurrentUser current;
    private final com.resqlink.service.AuditService auditService;
    private final com.resqlink.service.ai.AiEvalService aiEval;
    private final com.resqlink.security.RateLimiter limiter;
    private final com.resqlink.service.DemoService demo;

    public AdminController(AdminService admin, AuthService auth, CurrentUser current, com.resqlink.service.AuditService auditService,
                           com.resqlink.service.ai.AiEvalService aiEval, com.resqlink.security.RateLimiter limiter,
                           com.resqlink.service.DemoService demo) {
        this.auditService = auditService;
        this.aiEval = aiEval;
        this.limiter = limiter;
        this.demo = demo;
        this.admin = admin;
        this.auth = auth;
        this.current = current;
    }

    @GetMapping("/users")
    public List<UserDto> users(@RequestParam(required = false) Role role, @RequestParam(required = false) VerificationStatus status) {
        current.requireRole(Role.ADMIN);
        return admin.listUsers(role, status);
    }

    @PostMapping("/users")
    @ResponseStatus(HttpStatus.CREATED)
    public UserDto create(@RequestBody @Valid CreateUserRequest req) {
        User a = current.requireRole(Role.ADMIN);
        return UserMapper.toDto(auth.createByAdmin(a.getId(), req));
    }

    @PatchMapping("/users/{id}/verification")
    public UserDto verification(@PathVariable Long id, @RequestBody @Valid VerificationRequest req) {
        return admin.setVerification(current.requireRole(Role.ADMIN), id, req.status());
    }

    @PatchMapping("/users/{id}/role")
    public UserDto role(@PathVariable Long id, @RequestBody @Valid RoleRequest req) {
        return admin.setRole(current.requireRole(Role.ADMIN), id, req.role());
    }

    @PatchMapping("/users/{id}/suspension")
    public UserDto suspension(@PathVariable Long id, @RequestBody @Valid SuspensionRequest req) {
        return admin.setSuspended(current.requireRole(Role.ADMIN), id, req.suspended(), req.reason());
    }

    @PostMapping("/users/{id}/revoke-sessions")
    public UserDto revoke(@PathVariable Long id) {
        return admin.revokeSessions(current.requireRole(Role.ADMIN), id);
    }

    @GetMapping("/audit-logs/verify")
    public com.resqlink.service.AuditService.Verification verifyAudit() {
        current.requireRole(Role.ADMIN);
        return auditService.verify();
    }

    @GetMapping("/audit-logs")
    public PageDto<AuditLogDto> audit(@RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "50") int size) {
        current.requireRole(Role.ADMIN);
        return admin.auditLogs(page, size);
    }

    /** Runs the AI evaluation set through the live analysis path. Limited because it makes real model calls. */
    @PostMapping("/ai-eval")
    public com.resqlink.web.dto.Dtos.AiEvalReportDto evaluate(@RequestParam(defaultValue = "false") boolean heldOut) {
        User a = current.requireRole(Role.ADMIN);
        if (!limiter.allow("ai-eval:" + a.getId(), 4, 3600)) {
            throw new com.resqlink.error.ApiException(HttpStatus.TOO_MANY_REQUESTS, "The evaluation can run 4 times per hour.");
        }
        return aiEval.run(heldOut);
    }

    /** Resets the incident data to a labelled demonstration scenario. Only available when DEMO_MODE=true. */
    @PostMapping("/demo/reset")
    public java.util.Map<String, Object> resetDemo() {
        return demo.reset(current.requireRole(Role.ADMIN));
    }
}
