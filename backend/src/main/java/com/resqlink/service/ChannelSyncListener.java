package com.resqlink.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

/** Starts the Nexconn synchronisation only after the assignment transaction has committed. */
@Component
public class ChannelSyncListener {
    private static final Logger log = LoggerFactory.getLogger(ChannelSyncListener.class);
    private final ChatService chat;

    public ChannelSyncListener(ChatService chat) { this.chat = chat; }

    @Async("aiExecutor")
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onRequested(ChatService.ChannelSyncRequested e) {
        try {
            chat.runSync(e.incidentId(), e.dispatcherId());
        } catch (RuntimeException ex) {
            log.warn("Channel sync for incident {} failed unexpectedly: {}", e.incidentId(), ex.getClass().getSimpleName());
        }
    }
}
