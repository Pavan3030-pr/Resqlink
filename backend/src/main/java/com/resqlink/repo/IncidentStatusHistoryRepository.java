package com.resqlink.repo;

import com.resqlink.domain.IncidentStatusHistory;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface IncidentStatusHistoryRepository extends JpaRepository<IncidentStatusHistory, Long> {
    List<IncidentStatusHistory> findByIncidentIdOrderByCreatedAtAsc(Long incidentId);
}
