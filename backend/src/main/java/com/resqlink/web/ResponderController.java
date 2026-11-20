package com.resqlink.web;

import com.resqlink.domain.Role;
import com.resqlink.security.CurrentUser;
import com.resqlink.service.AssignmentService;
import com.resqlink.service.ResponderService;
import com.resqlink.web.dto.Dtos.AssignRequest;
import com.resqlink.web.dto.Dtos.AssignmentDto;
import com.resqlink.web.dto.Dtos.AssignmentResultDto;
import com.resqlink.web.dto.Dtos.AssignmentStatusRequest;
import com.resqlink.web.dto.Dtos.AvailabilityRequest;
import com.resqlink.web.dto.Dtos.LocationRequest;
import com.resqlink.web.dto.Dtos.ReassignRequest;
import com.resqlink.web.dto.Dtos.ResponderDto;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1")
public class ResponderController {
    private final ResponderService responders;
    private final AssignmentService assignments;
    private final CurrentUser current;
    private final com.resqlink.service.IdempotencyService idempotency;

    public ResponderController(ResponderService responders, AssignmentService assignments, CurrentUser current,
                               com.resqlink.service.IdempotencyService idempotency) {
        this.idempotency = idempotency;
        this.responders = responders;
        this.assignments = assignments;
        this.current = current;
    }

    @GetMapping("/responders")
    public List<ResponderDto> list() {
        current.requireRole(Role.DISPATCHER, Role.ADMIN);
        return responders.list(false);
    }

    @GetMapping("/responders/available")
    public List<ResponderDto> available() {
        current.requireRole(Role.DISPATCHER, Role.ADMIN);
        return responders.list(true);
    }

    @GetMapping("/responders/me")
    public ResponderDto me() { return responders.me(current.requireRole(Role.RESPONDER)); }

    @PatchMapping("/responders/availability")
    public ResponderDto availability(@RequestBody @Valid AvailabilityRequest req) {
        return responders.setAvailability(current.requireRole(Role.RESPONDER), req);
    }

    @PatchMapping("/responders/location")
    public ResponderDto location(@RequestBody @Valid LocationRequest req) {
        return responders.updateLocation(current.requireRole(Role.RESPONDER), req);
    }

    @PostMapping("/assignments")
    @ResponseStatus(HttpStatus.CREATED)
    public AssignmentResultDto assign(@RequestBody @Valid AssignRequest req,
                                      @org.springframework.web.bind.annotation.RequestHeader(value = "Idempotency-Key", required = false) String idemKey) {
        var dispatcher = current.requireRole(Role.DISPATCHER, Role.ADMIN);
        return idempotency.execute(dispatcher.getId(), "assignment.create", idemKey, AssignmentResultDto.class, () -> assignments.assign(dispatcher, req));
    }

    @GetMapping("/assignments/mine")
    public List<AssignmentDto> mine() { return assignments.mine(current.requireRole(Role.RESPONDER)); }

    @PatchMapping("/assignments/{id}/status")
    public AssignmentDto status(@PathVariable Long id, @RequestBody @Valid AssignmentStatusRequest req) {
        return assignments.updateStatus(current.requireRole(Role.RESPONDER, Role.DISPATCHER, Role.ADMIN), id, req);
    }

    @PostMapping("/assignments/{id}/reassign")
    public AssignmentResultDto reassign(@PathVariable Long id, @RequestBody @Valid ReassignRequest req) {
        return assignments.reassign(current.requireRole(Role.DISPATCHER, Role.ADMIN), id, req.newResponderId());
    }
}
