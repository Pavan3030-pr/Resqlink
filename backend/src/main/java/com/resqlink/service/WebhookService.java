package com.resqlink.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.resqlink.config.AppProperties;
import com.resqlink.core.IncidentNumbers;
import com.resqlink.core.WebhookVerifier;
import java.time.Duration;
import com.resqlink.domain.AssignmentStatus;
import com.resqlink.domain.IncidentChannel;
import com.resqlink.error.ApiException;
import com.resqlink.repo.IncidentAssignmentRepository;
import com.resqlink.repo.IncidentChannelRepository;
import com.resqlink.repo.IncidentRepository;
import java.time.Instant;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Handles Nexconn webhook callbacks: verifies authenticity, then records message activity on the
 * matching incident channel and notifies the other channel participants.
 */
@Service
public class WebhookService {
    private static final Logger log = LoggerFactory.getLogger(WebhookService.class);

    private final AppProperties.Nexconn cfg;
    private final ObjectMapper mapper;
    private final IncidentChannelRepository channels;
    private final IncidentRepository incidents;
    private final IncidentAssignmentRepository assignments;
    private final NotificationService notifications;
    private final WebhookVerifier verifier;

    public WebhookService(AppProperties props, ObjectMapper mapper, IncidentChannelRepository channels,
                          IncidentRepository incidents, IncidentAssignmentRepository assignments,
                          NotificationService notifications, JdbcNonceStore nonces) {
        this.cfg = props.nexconn();
        this.mapper = mapper;
        this.channels = channels;
        this.incidents = incidents;
        this.assignments = assignments;
        this.notifications = notifications;
        this.verifier = new WebhookVerifier(cfg.appSecret(), Duration.ofSeconds(cfg.webhookMaxSkewSeconds()), nonces);
    }

    /**
     * Authenticates a webhook: signature, freshness and single-use nonce (shared across instances).
     * Nexconn's signature does not cover the body, so nothing here may trust the body for privileged actions.
     */
    public void verify(String nonce, String timestamp, String signature) {
        WebhookVerifier.Result r = verifier.verify(nonce, timestamp, signature, java.time.Instant.now());
        if (r == WebhookVerifier.Result.OK) return;
        log.warn("Rejected Nexconn webhook: {}", r);
        throw new ApiException(HttpStatus.UNAUTHORIZED, r == WebhookVerifier.Result.REPLAY ? "Webhook replay rejected" : "Invalid webhook");
    }

    /** Accepts a single event object or an array of events. Unknown shapes are ignored, never trusted. */
    @Transactional
    public int handle(String rawBody) {
        JsonNode root;
        try {
            root = mapper.readTree(rawBody);
        } catch (Exception e) {
            throw ApiException.badRequest("Webhook body is not valid JSON");
        }
        int handled = 0;
        if (root.isArray()) {
            for (JsonNode n : root) handled += handleOne(n);
        } else if (root != null && root.isObject()) {
            handled += handleOne(root);
        }
        return handled;
    }

    private int handleOne(JsonNode n) {
        String channelId = firstText(n, "channelId", "toChannelId", "targetId", "groupId");
        String sender = firstText(n, "senderUserId", "fromUserId", "senderId");
        if (!IncidentNumbers.isIncidentChannel(channelId)) return 0;
        IncidentChannel ch = channels.findByNexconnChannelId(channelId).orElse(null);
        if (ch == null) return 0;

        ch.setLastMessageAt(Instant.now());
        ch.setMessageCount(ch.getMessageCount() + 1);
        channels.save(ch);

        Set<String> recipients = new HashSet<>();
        assignments.findByIncidentIdAndAssignmentStatusIn(ch.getIncidentId(),
                List.of(AssignmentStatus.ASSIGNED, AssignmentStatus.ACCEPTED, AssignmentStatus.ARRIVED))
                .forEach(a -> recipients.add(String.valueOf(a.getResponderId())));
        incidents.findById(ch.getIncidentId()).ifPresent(i -> {
            if (ch.isReporterInvited()) recipients.add(String.valueOf(i.getReportedBy()));
            if (i.getVerifiedBy() != null) recipients.add(String.valueOf(i.getVerifiedBy()));
            String number = i.getIncidentNumber();
            for (String uid : recipients) {
                if (sender != null && IncidentNumbers.chatUserId(Long.parseLong(uid)).equals(sender)) continue;
                notifications.notifyOnce(Long.parseLong(uid), i.getId(), "NEW_MESSAGE", "New message in " + number,
                        "There is new activity in the incident channel.");
            }
        });
        log.debug("Webhook message recorded for {}", channelId);
        return 1;
    }

    private static String firstText(JsonNode n, String... keys) {
        for (String k : keys) {
            JsonNode v = n.get(k);
            if (v != null && v.isTextual() && !v.asText().isBlank()) return v.asText();
        }
        return null;
    }
}
