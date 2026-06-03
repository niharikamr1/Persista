package com.aicc.backend.capture.infrastructure.persistence;

import com.aicc.backend.capture.application.port.out.CaptureEventPort;
import com.aicc.backend.capture.domain.CaptureEvent;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CaptureEventJpaRepository
        extends JpaRepository<CaptureEvent, String>, CaptureEventPort {

    List<CaptureEvent> findBySessionIdOrderBySequenceNumberAsc(String sessionId);

    Page<CaptureEvent> findByUserIdOrderByReceivedAtDesc(String userId, Pageable pageable);

    // Returns only the IDs from the provided list that already exist — used for idempotency
    @Query("SELECT e.id FROM CaptureEvent e WHERE e.id IN :ids")
    List<String> findExistingIds(@Param("ids") List<String> ids);

    @Query("SELECT MAX(e.sequenceNumber) FROM CaptureEvent e WHERE e.sessionId = :sessionId")
    Long findMaxSequenceNumberBySessionId(@Param("sessionId") String sessionId);

    @Modifying
    @Query("DELETE FROM CaptureEvent e WHERE e.sessionId = :sessionId")
    void deleteBySessionId(@Param("sessionId") String sessionId);

    @Query("SELECT e.sessionId, COUNT(e) FROM CaptureEvent e WHERE e.sessionId IN :sessionIds AND e.eventType = 'PROMPT_SENT' GROUP BY e.sessionId")
    List<Object[]> countEventsBySessionIds(@Param("sessionIds") List<String> sessionIds);
}
