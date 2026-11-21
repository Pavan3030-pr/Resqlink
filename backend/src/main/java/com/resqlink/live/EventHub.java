package com.resqlink.live;

import com.resqlink.domain.Incident;
import com.resqlink.domain.Role;
import com.resqlink.domain.User;
import com.resqlink.domain.AccountStatus;
import com.resqlink.repo.IncidentRepository;
import com.resqlink.repo.UserRepository;
import com.resqlink.security.CurrentUser;
import com.resqlink.service.IncidentService;
import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.atomic.AtomicLong;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

/**
 * Server-Sent Events fan-out. Connections are per instance; with several backend instances each one pushes the events
 * it produced itself, and the frontend also polls on a slow interval so a missed hint only delays an update.
 */
@Component
public class EventHub {
    private static final Logger log = LoggerFactory.getLogger(EventHub.class);
    private static final int MAX_STREAMS_PER_USER = 4;

    private record Sub(long userId, Role role, int tokenVersion, SseEmitter emitter) {}

    private final Map<Long, List<Sub>> subs = new ConcurrentHashMap<>();
    private final AtomicLong seq = new AtomicLong();
    private final IncidentRepository incidents;
    private final IncidentService incidentService;
    private final UserRepository users;

    public EventHub(IncidentRepository incidents, IncidentService incidentService, UserRepository users) {
        this.users = users;
        this.incidents = incidents;
        this.incidentService = incidentService;
    }

    public SseEmitter subscribe(User user) {
        SseEmitter emitter = new SseEmitter(30 * 60_000L);
        List<Sub> list = subs.computeIfAbsent(user.getId(), k -> new CopyOnWriteArrayList<>());
        Sub sub = new Sub(user.getId(), user.getRole(), user.getTokenVersion(), emitter);
        while (list.size() >= MAX_STREAMS_PER_USER) {
            Sub oldest = list.remove(0);
            try { oldest.emitter().complete(); } catch (RuntimeException ignored) { /* already closed */ }
        }
        list.add(sub);
        Runnable cleanup = () -> list.remove(sub);
        emitter.onCompletion(cleanup);
        emitter.onTimeout(cleanup);
        emitter.onError(e -> cleanup.run());
        try {
            emitter.send(SseEmitter.event().name("ready").id(String.valueOf(seq.get())).data("{\"serverTime\":" + System.currentTimeMillis() + "}"));
        } catch (IOException e) {
            cleanup.run();
        }
        return emitter;
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT, fallbackExecution = true)
    public void on(LiveEvent e) {
        long id = seq.incrementAndGet();
        String data = "{\"type\":\"" + e.type() + "\",\"incidentId\":" + e.incidentId() + ",\"at\":" + System.currentTimeMillis() + "}";
        Incident incident = e.incidentId() == null ? null : incidents.findById(e.incidentId()).orElse(null);
        for (List<Sub> list : subs.values()) {
            for (Sub s : list) {
                if (!deliverTo(s, e, incident)) continue;
                try {
                    s.emitter().send(SseEmitter.event().id(String.valueOf(id)).name(e.type()).data(data));
                } catch (IOException | IllegalStateException ex) {
                    list.remove(s);
                }
            }
        }
    }

    private boolean deliverTo(Sub s, LiveEvent e, Incident incident) {
        boolean staff = s.role() == Role.DISPATCHER || s.role() == Role.ADMIN;
        if (e.userId() != null) return e.userId() == s.userId();
        if (e.staffOnly()) return staff;
        if (staff) return true;
        if (incident == null) return false;
        try {
            User u = new User();
            u.setId(s.userId());
            u.setRole(s.role());
            return incidentService.canAccess(u, incident);
        } catch (RuntimeException ex) {
            return false;
        }
    }

    /**
     * Heartbeat plus re-validation: a stream is closed once its account is suspended, its role changed or its
     * sessions were revoked, so authorisation changes apply within one heartbeat instead of at the 30-minute timeout.
     */
    @Scheduled(fixedDelay = 20_000, initialDelay = 20_000)
    public void heartbeat() {
        for (Map.Entry<Long, List<Sub>> entry : subs.entrySet()) {
            List<Sub> list = entry.getValue();
            if (list.isEmpty()) continue;
            User current = users.findById(entry.getKey()).orElse(null);
            for (Sub s : list) {
                boolean stale = current == null || current.getStatus() != AccountStatus.ACTIVE
                        || current.getRole() != s.role() || current.getTokenVersion() != s.tokenVersion();
                if (stale) {
                    list.remove(s);
                    try { s.emitter().complete(); } catch (RuntimeException ignored) { /* already closed */ }
                    continue;
                }
                try {
                    s.emitter().send(SseEmitter.event().comment("hb"));
                } catch (IOException | IllegalStateException ex) {
                    list.remove(s);
                }
            }
        }
    }

    public int activeStreams() { return subs.values().stream().mapToInt(List::size).sum(); }
}
