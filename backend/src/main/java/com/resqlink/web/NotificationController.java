package com.resqlink.web;

import com.resqlink.security.CurrentUser;
import com.resqlink.service.NotificationService;
import com.resqlink.web.dto.Dtos.NotificationDto;
import java.util.List;
import java.util.Map;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/notifications")
public class NotificationController {
    private final NotificationService notifications;
    private final CurrentUser current;

    public NotificationController(NotificationService notifications, CurrentUser current) {
        this.notifications = notifications;
        this.current = current;
    }

    @GetMapping
    public Map<String, Object> list(@RequestParam(defaultValue = "30") int limit) {
        Long id = current.get().getId();
        List<NotificationDto> items = notifications.list(id, limit);
        return Map.of("items", items, "unread", notifications.unread(id));
    }

    @PostMapping("/{id}/read")
    public Map<String, Boolean> read(@PathVariable Long id) { return Map.of("ok", notifications.markRead(current.get().getId(), id)); }

    @PostMapping("/read-all")
    public Map<String, Integer> readAll() { return Map.of("updated", notifications.markAllRead(current.get().getId())); }
}
