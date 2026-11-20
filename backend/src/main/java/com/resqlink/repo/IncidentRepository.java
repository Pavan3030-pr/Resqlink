package com.resqlink.repo;

import com.resqlink.core.IncidentStatus;
import com.resqlink.domain.Incident;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface IncidentRepository extends JpaRepository<Incident, Long>, JpaSpecificationExecutor<Incident> {

    Optional<Incident> findByImageUrl(String imageUrl);

    @Query(value = "SELECT nextval('incident_number_seq')", nativeQuery = true)
    long nextNumberSequence();

    /** Nearby recent incidents (PostGIS ST_DWithin on geography, metres) that could be duplicates. */
    @Query(value = """
            SELECT i.* FROM incidents i
            WHERE i.id <> :excludeId
              AND i.created_at >= :since
              AND i.status NOT IN ('REJECTED')
              AND ST_DWithin(i.location, CAST(ST_SetSRID(ST_MakePoint(:lng, :lat), 4326) AS geography), :meters)
            ORDER BY i.created_at DESC
            LIMIT 50
            """, nativeQuery = true)
    List<Incident> findNearbyRecent(@Param("excludeId") long excludeId, @Param("lat") double lat,
                                    @Param("lng") double lng, @Param("meters") double meters,
                                    @Param("since") Instant since);

    long countByStatus(IncidentStatus status);

    long countByDuplicateOfId(Long duplicateOfId);

    long countByDemoTrue();

    interface KeyCount {
        String getLabel();

        Long getTotal();
    }

    @Query("select cast(i.status as string) as label, count(i) as total from Incident i group by i.status")
    List<KeyCount> countGroupedByStatus();

    @Query("select cast(i.priority as string) as label, count(i) as total from Incident i "
            + "where i.priority is not null group by i.priority")
    List<KeyCount> countGroupedByPriority();

    @Query("select cast(i.category as string) as label, count(i) as total from Incident i group by i.category")
    List<KeyCount> countGroupedByCategory();

    /** Average minutes from report creation until the incident first reached the given status. */
    @Query(value = """
            SELECT AVG(EXTRACT(EPOCH FROM (h.first_at - i.created_at)) / 60.0)
            FROM incidents i
            JOIN (SELECT incident_id, MIN(created_at) AS first_at FROM incident_status_history
                  WHERE new_status = :status GROUP BY incident_id) h ON h.incident_id = i.id
            """, nativeQuery = true)
    Double avgMinutesToStatus(@Param("status") String status);

    /** Average minutes between two lifecycle statuses of the same incident. */
    @Query(value = """
            SELECT AVG(EXTRACT(EPOCH FROM (b.first_at - a.first_at)) / 60.0)
            FROM (SELECT incident_id, MIN(created_at) AS first_at FROM incident_status_history
                  WHERE new_status = :fromStatus GROUP BY incident_id) a
            JOIN (SELECT incident_id, MIN(created_at) AS first_at FROM incident_status_history
                  WHERE new_status = :toStatus GROUP BY incident_id) b ON a.incident_id = b.incident_id
            """, nativeQuery = true)
    Double avgMinutesBetween(@Param("fromStatus") String fromStatus, @Param("toStatus") String toStatus);
}
