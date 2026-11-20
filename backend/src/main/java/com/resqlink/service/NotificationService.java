package com.resqlink.service;

import com.resqlink.domain.Notification;
import com.resqlink.domain.Role;
import com.resqlink.domain.User;
import com.resqlink.repo.NotificationRepository;
import com.resqlink.repo.UserRepository;
import com.resqlink.web.dto.Dtos.NotificationDto;
import java.time.Instant;
import java.util.List;
import java.util.Set;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** In-app notification service for application events (chat messages are delivered by Nexconn itself). */
@Service
public class NotificationService {
    private final NotificationRepository repo;
    private final UserRepository users;
    private final com.resqlink.live.LiveEvents live;

    public NotificationService(NotificationRepository repo, UserRepository users, com.resqlink.live.LiveEvents live) {
        this.live = live;
        this.repo = repo;
        this.users = users;
    }

    @Transactional
    public void notify(Long userId, Long incidentId, String type, String title, String message) {
        if (userId == null) return;
        Notification n = new Notification();
        n.setUserId(userId);
        n.setIncidentId(incidentId);
        n.setNotificationType(type);
        n.setTitle(title.length() > 160 ? title.substring(0, 160) : title);
        n.setMessage(message.length() > 400 ? message.substring(0, 400) : message);
        n.setDeliveryStatus("DELIVERED");
        n.setCreatedAt(Instant.now());
        repo.save(n);
        live.user(userId, "notification", incidentId);
    }

    /** Like notify, but skips if the user already has an unread notification of this type for the incident. */
    @Transactional
    public void notifyOnce(Long userId, Long incidentId, String type, String title, String message) {
        if (userId == null) return;
        if (repo.existsByUserIdAndIncidentIdAndNotificationTypeAndReadAtIsNull(userId, incidentId, type)) return;
        notify(userId, incidentId, type, title, message);
    }

    @Transactional
    public void notifyStaff(Long incidentId, String type, String title, String message) {
        for (User u : users.findByRoleIn(Set.of(Role.DISPATCHER, Role.ADMIN))) {
            notify(u.getId(), incidentId, type, title, message);
        }
    }

    @Transactional(readOnly = true)
    public List<NotificationDto> list(Long userId, int limit) {
        return repo.findByUserIdOrderByCreatedAtDesc(userId, PageRequest.of(0, Math.min(Math.max(limit, 1), 100)))
                .stream().map(n -> new NotificationDto(n.getId(), n.getIncidentId(), n.getNotificationType(),
                        n.getTitle(), n.getMessage(), n.getCreatedAt(), n.getReadAt() != null)).toList();
    }

    @Transactional(readOnly = true)
    public long unread(Long userId) { return repo.countByUserIdAndReadAtIsNull(userId); }

    @Transactional
    public boolean markRead(Long userId, Long id) {
        return repo.findById(id).filter(n -> n.getUserId().equals(userId)).map(n -> {
            if (n.getReadAt() == null) {
                n.setReadAt(Instant.now());
                n.setDeliveryStatus("READ");
            }
            return true;
        }).orElse(false);
    }

    @Transactional
    public int markAllRead(Long userId) { return repo.markAllRead(userId); }
}
