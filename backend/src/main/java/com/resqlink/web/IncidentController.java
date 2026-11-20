package com.resqlink.web;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.resqlink.core.Category;
import com.resqlink.core.IncidentStatus;
import com.resqlink.core.Priority;
import com.resqlink.domain.Role;
import com.resqlink.domain.User;
import com.resqlink.error.ApiException;
import com.resqlink.security.CurrentUser;
import com.resqlink.service.IncidentService;
import com.resqlink.service.IncidentService.Filter;
import com.resqlink.web.dto.Dtos.CreateIncidentRequest;
import com.resqlink.web.dto.Dtos.IncidentDetailDto;
import com.resqlink.web.dto.Dtos.IncidentSummaryDto;
import com.resqlink.web.dto.Dtos.MapMarkerDto;
import com.resqlink.web.dto.Dtos.PageDto;
import com.resqlink.web.dto.Dtos.PriorityRequest;
import com.resqlink.web.dto.Dtos.StatsDto;
import com.resqlink.web.dto.Dtos.StatusChangeRequest;
import jakarta.validation.Validator;
import java.time.Instant;
import java.util.List;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/v1/incidents")
public class IncidentController {
    private final IncidentService incidents;
    private final CurrentUser current;
    private final ObjectMapper mapper;
    private final Validator validator;
    private final com.resqlink.service.IdempotencyService idempotency;
    private final com.resqlink.security.RateLimiter limiter;

    public IncidentController(IncidentService incidents, CurrentUser current, ObjectMapper mapper, Validator validator,
                              com.resqlink.service.IdempotencyService idempotency, com.resqlink.security.RateLimiter limiter) {
        this.idempotency = idempotency;
        this.limiter = limiter;
        this.incidents = incidents;
        this.current = current;
        this.mapper = mapper;
        this.validator = validator;
    }

    /** multipart/form-data: part "data" (JSON) and optional part "image". */
    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    public IncidentDetailDto create(@RequestPart("data") String data,
                                    @RequestPart(value = "image", required = false) MultipartFile image,
                                    @org.springframework.web.bind.annotation.RequestHeader(value = "Idempotency-Key", required = false) String idemKey) {
        User u = current.requireRole(Role.CITIZEN, Role.DISPATCHER, Role.ADMIN);
        throttleReports(u);
        CreateIncidentRequest req;
        try {
            req = mapper.readValue(data, CreateIncidentRequest.class);
        } catch (Exception e) {
            throw ApiException.badRequest("Report data is not valid JSON");
        }
        var violations = validator.validate(req);
        if (!violations.isEmpty()) {
            throw ApiException.badRequest(violations.iterator().next().getPropertyPath() + ": "
                    + violations.iterator().next().getMessage());
        }
        return idempotency.execute(u.getId(), "incident.create", idemKey, IncidentDetailDto.class, () -> incidents.create(u, req, image));
    }

    @PostMapping(consumes = MediaType.APPLICATION_JSON_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    public IncidentDetailDto createJson(@RequestBody @jakarta.validation.Valid CreateIncidentRequest req,
                                        @org.springframework.web.bind.annotation.RequestHeader(value = "Idempotency-Key", required = false) String idemKey) {
        User u = current.requireRole(Role.CITIZEN, Role.DISPATCHER, Role.ADMIN);
        throttleReports(u);
        return idempotency.execute(u.getId(), "incident.create", idemKey, IncidentDetailDto.class, () -> incidents.create(u, req, null));
    }

    /** Per-user limit (shared across instances) so one account cannot flood the dispatcher queue. */
    private void throttleReports(User u) {
        if (!limiter.allow("report:" + u.getId(), 6, 60)) {
            throw new com.resqlink.error.ApiException(HttpStatus.TOO_MANY_REQUESTS, "You are sending reports too quickly. Wait a minute and try again.");
        }
    }

    @GetMapping
    public PageDto<IncidentSummaryDto> list(
            @RequestParam(required = false) IncidentStatus status, @RequestParam(required = false) Priority priority,
            @RequestParam(required = false) Category category, @RequestParam(required = false) Long assignedTo,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant to,
            @RequestParam(required = false) String q, @RequestParam(required = false) Boolean unassigned,
            @RequestParam(required = false) Boolean activeOnly,
            @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "createdAt") String sort) {
        User u = current.getOperational();
        return incidents.list(u, new Filter(status, priority, category, assignedTo, from, to, q, unassigned, activeOnly),
                page, size, sort);
    }

    @GetMapping("/map")
    public List<MapMarkerDto> map(
            @RequestParam(required = false) IncidentStatus status, @RequestParam(required = false) Priority priority,
            @RequestParam(required = false) Category category, @RequestParam(required = false) Long assignedTo,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant to,
            @RequestParam(required = false) Boolean activeOnly) {
        User u = current.getOperational();
        return incidents.map(u, new Filter(status, priority, category, assignedTo, from, to, null, null, activeOnly));
    }

    @GetMapping("/stats")
    public StatsDto stats() {
        current.requireRole(Role.DISPATCHER, Role.ADMIN);
        return incidents.stats();
    }

    @GetMapping("/{id}")
    public IncidentDetailDto get(@PathVariable Long id) { return incidents.detail(current.getOperational(), id); }

    @PatchMapping("/{id}/status")
    public IncidentDetailDto status(@PathVariable Long id, @RequestBody @jakarta.validation.Valid StatusChangeRequest req) {
        return incidents.changeStatus(current.requireRole(Role.DISPATCHER, Role.ADMIN), id, req);
    }

    @PatchMapping("/{id}/priority")
    public IncidentDetailDto priority(@PathVariable Long id, @RequestBody @jakarta.validation.Valid PriorityRequest req) {
        return incidents.setPriority(current.requireRole(Role.DISPATCHER, Role.ADMIN), id, req.priority());
    }

    @PatchMapping("/{id}/category")
    public IncidentDetailDto category(@PathVariable Long id, @RequestBody @jakarta.validation.Valid com.resqlink.web.dto.Dtos.CategoryRequest req) {
        return incidents.overrideCategory(current.requireRole(Role.DISPATCHER, Role.ADMIN), id, req.category(), req.reason());
    }

    /** Timeline and audit trail for evidence and after-action review. */
    @GetMapping("/{id}/export")
    public com.resqlink.web.dto.Dtos.IncidentExportDto export(@PathVariable Long id) {
        return incidents.export(current.requireRole(Role.DISPATCHER, Role.ADMIN), id);
    }
}
