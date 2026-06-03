package com.aicc.backend.semantic.application.service;

import com.aicc.backend.capture.application.EventsIngestedEvent;
import com.aicc.backend.capture.application.port.out.CaptureEventPort;
import com.aicc.backend.capture.domain.CaptureEvent;
import com.aicc.backend.common.util.IdGenerator;
import com.aicc.backend.semantic.application.port.in.StoreMemoryUseCase;
import com.aicc.backend.semantic.application.port.out.ProcessingJobPort;
import com.aicc.backend.semantic.domain.ProcessingJob;
import com.aicc.backend.semantic.domain.ProcessingStatus;
import com.aicc.backend.semantic.infrastructure.ai.SemanticExtractionAdapter;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.scheduling.annotation.Async;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class SemanticProcessingService {

    private static final int MAX_ATTEMPTS = 3;

    private final ProcessingJobPort processingJobPort;
    private final CaptureEventPort captureEventPort;
    private final StoreMemoryUseCase storeMemoryUseCase;
    private final SemanticExtractionAdapter extractionAdapter;

    // ── Ingest trigger ────────────────────────────────────────────────────────

    /**
     * Fires after the ingest transaction commits — events are now visible to all readers.
     * Schedules async semantic processing for each accepted conversation event.
     */
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    @Async
    public void onEventsIngested(EventsIngestedEvent event) {
        for (CaptureEvent captureEvent : event.acceptedEvents()) {
            if (!EventTextExtractor.extract(captureEvent).isPresent()) continue;
            scheduleJob(captureEvent);
        }
    }

    // ── Retry scheduler ───────────────────────────────────────────────────────

    /**
     * Re-processes PENDING jobs that have at least one prior failure (attempts > 0).
     * Runs 5 minutes after the previous execution completes.
     */
    @Scheduled(fixedDelay = 300_000)
    public void retryFailedJobs() {
        List<ProcessingJob> retryable =
                processingJobPort.findByStatusAndAttemptsGreaterThan(ProcessingStatus.PENDING, 0);
        if (retryable.isEmpty()) return;

        log.info("Retrying {} semantic processing job(s)", retryable.size());
        for (ProcessingJob job : retryable) {
            Optional<CaptureEvent> eventOpt = captureEventPort.findById(job.getEventId());
            if (eventOpt.isEmpty()) {
                job.setStatus(ProcessingStatus.FAILED);
                job.setLastError("Source event deleted");
                processingJobPort.save(job);
                continue;
            }
            executeJob(job, eventOpt.get());
        }
    }

    // ── Core pipeline ─────────────────────────────────────────────────────────

    private void scheduleJob(CaptureEvent event) {
        if (processingJobPort.existsByEventId(event.getId())) return;

        ProcessingJob job = ProcessingJob.builder()
                .id(IdGenerator.prefixed("job"))
                .eventId(event.getId())
                .build();
        try {
            processingJobPort.save(job);
        } catch (DataIntegrityViolationException e) {
            // Concurrent insert — another thread already created the job
            return;
        }
        executeJob(job, event);
    }

    private void executeJob(ProcessingJob job, CaptureEvent event) {
        job.setAttempts(job.getAttempts() + 1);

        try {
            Optional<String> textOpt = EventTextExtractor.extract(event);
            if (textOpt.isEmpty()) {
                job.setStatus(ProcessingStatus.SKIPPED);
                processingJobPort.save(job);
                return;
            }

            String text = textOpt.get().trim();
            if (text.length() < 20) {
                // Skip trivial content ("Hey", "hi", "ok") — not worth embedding
                job.setStatus(ProcessingStatus.SKIPPED);
                processingJobPort.save(job);
                return;
            }

            List<String> chunks = TextChunker.chunk(text);
            for (String chunk : chunks) {
                SemanticExtractionAdapter.ExtractionResult result = extractionAdapter.extract(chunk);
                storeMemoryUseCase.store(
                        event.getUserId(),
                        event.getId(),
                        result.type(),
                        result.content(),
                        result.summary());
            }

            job.setStatus(ProcessingStatus.COMPLETE);
            job.setProcessedAt(Instant.now());
            job.setLastError(null);
            log.debug("Semantic processing complete: event={} chunks={}", event.getId(), chunks.size());

        } catch (Exception e) {
            log.warn("Semantic processing failed: event={} attempt={}", event.getId(), job.getAttempts(), e);
            job.setLastError(truncateError(e.getMessage()));
            if (job.getAttempts() >= MAX_ATTEMPTS) {
                job.setStatus(ProcessingStatus.FAILED);
                log.error("Semantic processing permanently failed after {} attempts: event={}",
                        MAX_ATTEMPTS, event.getId());
            }
            // Status stays PENDING so the scheduler retries
        }

        processingJobPort.save(job);
    }

    private static String truncateError(String msg) {
        if (msg == null) return null;
        return msg.length() > 500 ? msg.substring(0, 500) : msg;
    }
}
