package com.aicc.backend.capture.application.service;

import com.aicc.backend.capture.application.BatchIngestResult;
import com.aicc.backend.capture.application.EventsIngestedEvent;
import com.aicc.backend.capture.application.port.in.IngestEventsUseCase;
import com.aicc.backend.capture.application.port.in.QueryEventsUseCase;
import com.aicc.backend.capture.application.port.out.CaptureEventPort;
import com.aicc.backend.capture.domain.CaptureEvent;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CaptureEventService implements IngestEventsUseCase, QueryEventsUseCase {

    private final CaptureEventPort captureEventPort;
    private final ApplicationEventPublisher eventPublisher;

    @Override
    @Transactional
    public CaptureEvent ingest(CaptureEvent event) {
        // Single-event ingest: idempotent — return existing if already stored
        if (event.getId() != null && captureEventPort.findById(event.getId()).isPresent()) {
            return captureEventPort.findById(event.getId()).get();
        }
        event.setSequenceNumber(nextSeqForSession(event.getSessionId()));
        return captureEventPort.save(event);
    }

    /**
     * Idempotent batch ingest.
     *
     * Algorithm:
     *   1. Identify which client-provided IDs already exist in the store (duplicates).
     *   2. Filter to only genuinely new events.
     *   3. Sort new events per-session by clientTimestamp to guarantee ordering.
     *   4. Assign monotonically-increasing per-session sequence numbers.
     *   5. Persist in a single saveAll call.
     */
    @Override
    @Transactional
    public BatchIngestResult ingestBatch(List<CaptureEvent> events) {
        if (events.isEmpty()) return BatchIngestResult.empty();

        List<String> incomingIds = events.stream().map(CaptureEvent::getId).toList();

        // Step 1 — find duplicates
        Set<String> existingIds = Set.copyOf(captureEventPort.findExistingIds(incomingIds));
        List<String> duplicates = incomingIds.stream().filter(existingIds::contains).toList();

        // Step 2 — filter to new events only
        List<CaptureEvent> newEvents = events.stream()
                .filter(e -> !existingIds.contains(e.getId()))
                .collect(Collectors.toList());

        if (newEvents.isEmpty()) {
            return new BatchIngestResult(List.of(), duplicates, List.of(), null);
        }

        // Step 3 — assign per-session sequence numbers in clientTimestamp order
        Map<String, List<CaptureEvent>> bySession = newEvents.stream()
                .collect(Collectors.groupingBy(CaptureEvent::getSessionId));

        List<CaptureEvent> sequenced = new ArrayList<>();
        for (Map.Entry<String, List<CaptureEvent>> entry : bySession.entrySet()) {
            long nextSeq = nextSeqForSession(entry.getKey());
            List<CaptureEvent> sorted = entry.getValue().stream()
                    .sorted(Comparator.comparing(CaptureEvent::getClientTimestamp))
                    .toList();
            for (CaptureEvent e : sorted) {
                e.setSequenceNumber(nextSeq++);
                sequenced.add(e);
            }
        }

        // Step 4 — persist (batch via Hibernate session; saveAll removed from port to avoid type-erasure clash)
        sequenced.forEach(captureEventPort::save);

        List<String> acceptedIds = sequenced.stream().map(CaptureEvent::getId).toList();
        String checkpoint = acceptedIds.get(acceptedIds.size() - 1);

        // Step 5 — trigger async semantic processing after this transaction commits
        eventPublisher.publishEvent(new EventsIngestedEvent(List.copyOf(sequenced)));

        return new BatchIngestResult(acceptedIds, duplicates, List.of(), checkpoint);
    }

    @Override
    @Transactional(readOnly = true)
    public List<CaptureEvent> getSessionEvents(String sessionId) {
        return captureEventPort.findBySessionIdOrderBySequenceNumberAsc(sessionId);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<CaptureEvent> getUserEvents(String userId, Pageable pageable) {
        return captureEventPort.findByUserIdOrderByReceivedAtDesc(userId, pageable);
    }

    @Override
    @Transactional(readOnly = true)
    public Map<String, Long> countSessionEventsByIds(List<String> sessionIds) {
        if (sessionIds.isEmpty()) return Map.of();
        return captureEventPort.countEventsBySessionIds(sessionIds).stream()
                .collect(Collectors.toMap(
                        row -> (String) row[0],
                        row -> (Long) row[1]
                ));
    }

    private long nextSeqForSession(String sessionId) {
        Long max = captureEventPort.findMaxSequenceNumberBySessionId(sessionId);
        return max == null ? 1L : max + 1L;
    }
}
