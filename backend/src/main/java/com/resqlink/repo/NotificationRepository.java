package com.resqlink.repo;

import com.resqlink.domain.Notification;
import java.util.List;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface NotificationRepository extends JpaRepository<Notification, Long> {
    List<Notification> findByUserIdOrderByCreatedAtDesc(Long userId, Pageable pageable);

    long countByUserIdAndReadAtIsNull(Long userId);

    boolean existsByUserIdAndIncidentIdAndNotificationTypeAndReadAtIsNull(Long userId, Long incidentId, String notificationType);

    @Modifying
    @Query("update Notification n set n.readAt = current_timestamp, n.deliveryStatus = 'READ' "
            + "where n.userId = :userId and n.readAt is null")
    int markAllRead(@Param("userId") Long userId);
}
