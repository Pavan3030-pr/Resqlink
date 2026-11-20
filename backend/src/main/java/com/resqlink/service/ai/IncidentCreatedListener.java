package com.resqlink.service.ai;

import com.resqlink.service.IncidentCreatedEvent;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

/** Runs AI analysis asynchronously after a report commits so submission is never blocked by the model. */
@Component
public class IncidentCreatedListener {
    private static final Logger log = LoggerFactory.getLogger(IncidentCreatedListener.class);
    private final AiService ai;

    public IncidentCreatedListener(AiService ai) { this.ai = ai; }

    @Async("aiExecutor")
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onCreated(IncidentCreatedEvent e) {
        try {
            ai.analyzeAndStore(e.incidentId(), null);
        } catch (Exception ex) {
            log.error("AI analysis failed for incident {}", e.incidentId(), ex);
        }
    }
}
