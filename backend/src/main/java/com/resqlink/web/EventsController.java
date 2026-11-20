package com.resqlink.web;

import com.resqlink.live.EventHub;
import com.resqlink.security.CurrentUser;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

@RestController
@RequestMapping("/api/v1/events")
public class EventsController {
    private final EventHub hub;
    private final CurrentUser current;

    public EventsController(EventHub hub, CurrentUser current) {
        this.hub = hub;
        this.current = current;
    }

    /** Authenticated event stream (Authorization header). Events are hints; clients re-read state from the REST API. */
    @GetMapping(path = "/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter stream() { return hub.subscribe(current.getOperational()); }
}
