package com.resqlink.repo;

import com.resqlink.domain.AssignmentStatus;
import com.resqlink.domain.IncidentAssignment;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface IncidentAssignmentRepository extends JpaRepository<IncidentAssignment, Long> {
    List<IncidentAssignment> findByIncidentIdOrderByAssignedAtAsc(Long incidentId);

    List<IncidentAssignment> findByIncidentIdIn(Collection<Long> incidentIds);

    List<IncidentAssignment> findByResponderIdAndAssignmentStatusIn(Long responderId, Collection<AssignmentStatus> statuses);

    List<IncidentAssignment> findByResponderIdOrderByAssignedAtDesc(Long responderId);

    Optional<IncidentAssignment> findFirstByIncidentIdAndResponderIdAndAssignmentStatusIn(
            Long incidentId, Long responderId, Collection<AssignmentStatus> statuses);

    List<IncidentAssignment> findByIncidentIdAndAssignmentStatusIn(Long incidentId, Collection<AssignmentStatus> statuses);

    @Query("select a.responderId as responderId, count(a) as total from IncidentAssignment a "
            + "where a.assignmentStatus in :statuses group by a.responderId")
    List<WorkloadRow> workload(@Param("statuses") Collection<AssignmentStatus> statuses);

    interface WorkloadRow {
        Long getResponderId();

        Long getTotal();
    }

    long countByAssignmentStatus(AssignmentStatus status);
}
