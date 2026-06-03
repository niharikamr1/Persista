package com.aicc.backend.semantic.infrastructure.persistence;

import com.aicc.backend.semantic.application.port.out.ProcessingJobPort;
import com.aicc.backend.semantic.domain.ProcessingJob;
import com.aicc.backend.semantic.domain.ProcessingStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ProcessingJobJpaRepository
        extends JpaRepository<ProcessingJob, String>, ProcessingJobPort {

    Optional<ProcessingJob> findByEventId(String eventId);

    boolean existsByEventId(String eventId);

    List<ProcessingJob> findByStatusAndAttemptsGreaterThan(ProcessingStatus status, int minAttempts);
}
