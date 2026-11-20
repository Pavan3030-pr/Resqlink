package com.resqlink.live;

import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Component;

/** Publishes live hints; delivery happens after the surrounding transaction commits. */
@Component
public class LiveEvents {
    private final ApplicationEventPublisher publisher;

    public LiveEvents(ApplicationEventPublisher publisher) { this.publisher = publisher; }

    public void incident(String type, Long incidentId) { publisher.publishEvent(LiveEvent.incident(type, incidentId)); }

    public void user(Long userId, String type, Long incidentId) { publisher.publishEvent(LiveEvent.toUser(userId, type, incidentId)); }

    public void staff(String type) { publisher.publishEvent(LiveEvent.staff(type)); }
}
