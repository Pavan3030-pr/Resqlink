package com.resqlink.web;

import com.resqlink.domain.Role;
import com.resqlink.security.CurrentUser;
import com.resqlink.service.CheckInService;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/** Peer-support check-ins: anyone signed in can check in; verified volunteers, dispatchers and admins see the board. */
@RestController
@RequestMapping("/api/v1/check-ins")
public class CheckInController {
    private final CheckInService checkIns;
    private final CurrentUser current;

    public CheckInController(CheckInService checkIns, CurrentUser current) {
        this.checkIns = checkIns;
        this.current = current;
    }

    public record CheckInRequest(String status, String note, Integer intervalHours) {}

    public record FollowUpRequest(String note) {}

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public CheckInService.CheckInDto submit(@RequestBody CheckInRequest req) {
        return checkIns.submit(current.get(), req.status(), req.note(), req.intervalHours());
    }

    @GetMapping("/mine")
    public CheckInService.MineDto mine() {
        return checkIns.mine(current.get().getId());
    }

    @GetMapping("/board")
    public List<CheckInService.BoardRow> board() {
        current.requireRole(Role.DISPATCHER, Role.ADMIN, Role.RESPONDER);
        return checkIns.board();
    }

    @PostMapping("/{userId}/follow-up")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void followUp(@PathVariable Long userId, @RequestBody(required = false) FollowUpRequest req) {
        var by = current.requireRole(Role.DISPATCHER, Role.ADMIN, Role.RESPONDER);
        checkIns.followUp(by, userId, req == null ? null : req.note());
    }
}
