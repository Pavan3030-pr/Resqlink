package com.resqlink.repo;

import com.resqlink.domain.IncidentAiAnalysis;
import java.util.Optional;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.JpaRepository;

public interface IncidentAiAnalysisRepository extends JpaRepository<IncidentAiAnalysis, Long> {
    Optional<IncidentAiAnalysis> findFirstByIncidentIdOrderByCreatedAtDesc(Long incidentId);

    @Query("select count(distinct a.incidentId) from IncidentAiAnalysis a")
    long countAnalysedIncidents();

    @Query("select count(a) from IncidentAiAnalysis a where a.modelVersion like 'gemini%'")
    long countModelAnalyses();

    long count();
}
