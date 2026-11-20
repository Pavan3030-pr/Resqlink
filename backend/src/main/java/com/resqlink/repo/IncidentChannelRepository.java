package com.resqlink.repo;

import com.resqlink.domain.IncidentChannel;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.JpaRepository;

public interface IncidentChannelRepository extends JpaRepository<IncidentChannel, Long> {
    Optional<IncidentChannel> findByIncidentId(Long incidentId);

    Optional<IncidentChannel> findByNexconnChannelId(String nexconnChannelId);

    List<IncidentChannel> findByIncidentIdIn(Collection<Long> incidentIds);

    List<IncidentChannel> findBySyncStatusInAndNextRetryAtBefore(Collection<String> statuses, java.time.Instant before);

    @Query("select coalesce(sum(c.messageCount), 0) from IncidentChannel c")
    long totalMessages();
}
