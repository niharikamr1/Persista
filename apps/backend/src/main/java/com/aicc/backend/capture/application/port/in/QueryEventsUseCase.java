package com.aicc.backend.capture.application.port.in;

import com.aicc.backend.capture.domain.CaptureEvent;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.Map;

public interface QueryEventsUseCase {
    List<CaptureEvent> getSessionEvents(String sessionId);
    Page<CaptureEvent> getUserEvents(String userId, Pageable pageable);

    // Returns a map of sessionId → event count for all provided session IDs (single batch query)
    Map<String, Long> countSessionEventsByIds(List<String> sessionIds);
}
