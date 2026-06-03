package com.aicc.backend.context.application.service;

import com.aicc.backend.capture.application.port.out.CaptureEventPort;
import com.aicc.backend.capture.domain.CaptureEvent;
import com.aicc.backend.common.config.CacheConfig;
import com.aicc.backend.common.exception.ApiException;
import com.aicc.backend.common.exception.ErrorCode;
import com.aicc.backend.common.persistence.VectorConverter;
import com.aicc.backend.common.util.IdGenerator;
import com.aicc.backend.context.application.ContextReconstructCommand;
import com.aicc.backend.context.application.port.in.ReconstructContextUseCase;
import com.aicc.backend.context.domain.ContextSegment;
import com.aicc.backend.context.domain.ContextSegmentType;
import com.aicc.backend.context.domain.ReconstructedContext;
import com.aicc.backend.semantic.application.port.out.EmbeddingPort;
import com.aicc.backend.semantic.application.port.out.SemanticMemoryPort;
import com.aicc.backend.semantic.application.service.EventTextExtractor;
import com.aicc.backend.semantic.domain.SemanticMemory;
import com.aicc.backend.session.application.port.out.SessionPort;
import com.aicc.backend.session.domain.Session;
import com.aicc.backend.storage.application.port.out.FileRecordPort;
import com.aicc.backend.storage.domain.FileRecord;
import com.aicc.backend.storage.domain.UploadStatus;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.Cache;
import org.springframework.cache.CacheManager;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;

@Slf4j
@Service
@RequiredArgsConstructor
public class ContextReconstructionService implements ReconstructContextUseCase {

    private final CaptureEventPort captureEventPort;
    private final SessionPort sessionPort;
    private final FileRecordPort fileRecordPort;
    private final SemanticMemoryPort semanticMemoryPort;
    private final EmbeddingPort embeddingPort;
    private final ContextOptimizerService optimizer;
    private final CacheManager cacheManager;

    @Override
    public ReconstructedContext reconstruct(String userId, ContextReconstructCommand cmd) {
        String cacheKey = buildCacheKey(userId, cmd);

        Cache cache = cacheManager.getCache(CacheConfig.CONTEXT_CACHE);
        if (cache != null) {
            Cache.ValueWrapper wrapped = cache.get(cacheKey);
            if (wrapped != null) return (ReconstructedContext) wrapped.get();
        }

        try {
            ReconstructedContext ctx = doReconstruct(userId, cmd);
            if (cache != null) cache.put(cacheKey, ctx);
            return ctx;
        } catch (ApiException e) {
            throw e; // let domain errors propagate with their specific status + message
        } catch (Exception e) {
            log.error("Unexpected error reconstructing context for user {}: {}", userId, e.getMessage(), e);
            throw new ApiException(ErrorCode.SERVICE_UNAVAILABLE,
                    "Context reconstruction encountered an unexpected error. Please try again.");
        }
    }

    // ── Core assembly ─────────────────────────────────────────────────────────

    private ReconstructedContext doReconstruct(String userId, ContextReconstructCommand cmd) {
        String packageId = IdGenerator.prefixed("ctx");
        List<ContextSegment> candidates = new ArrayList<>();

        if (hasValue(cmd.sessionId())) {
            // Fail explicitly if the session doesn't belong to this user
            sessionPort.findByIdAndUserId(cmd.sessionId(), userId)
                    .map(this::sessionToSegment)
                    .ifPresentOrElse(
                            candidates::add,
                            () -> { throw ApiException.notFound("Session"); }
                    );
        } else if (hasValue(cmd.projectId())) {
            // Add a session segment for every session in the project
            projectSessions(cmd.projectId(), userId)
                    .forEach(s -> candidates.add(sessionToSegment(s)));
        }

        List<CaptureEvent> rawEvents = fetchEvents(userId, cmd);
        // A session-specific request with no events is a user-visible empty state, not a bug
        if (hasValue(cmd.sessionId()) && rawEvents.isEmpty()) {
            throw new ApiException(ErrorCode.UNPROCESSABLE,
                    "This session has no captured events yet. "
                    + "Start a conversation on ChatGPT, Claude, or Gemini and the extension will capture it automatically.");
        }
        candidates.addAll(eventsToSegments(rawEvents));
        candidates.addAll(filesToSegments(fetchFiles(userId, cmd), cmd.maxFiles()));
        candidates.addAll(memoriesToSegments(fetchMemories(userId, cmd)));

        List<ContextSegment> optimized = optimizer.optimize(candidates, cmd.tokenBudget());

        int eventCount   = count(optimized, ContextSegmentType.EVENT);
        int memoryCount  = count(optimized, ContextSegmentType.MEMORY);
        int fileCount    = count(optimized, ContextSegmentType.FILE);
        int totalTokens  = optimized.stream().mapToInt(ContextSegment::tokenCount).sum();

        return new ReconstructedContext(packageId, userId, cmd.sessionId(), cmd.projectId(),
                cmd.query(), optimized, totalTokens, eventCount, memoryCount, fileCount, Instant.now());
    }

    // ── Data retrieval ────────────────────────────────────────────────────────

    private List<CaptureEvent> fetchEvents(String userId, ContextReconstructCommand cmd) {
        if (hasValue(cmd.sessionId())) {
            List<CaptureEvent> all = captureEventPort
                    .findBySessionIdOrderBySequenceNumberAsc(cmd.sessionId());
            int size = all.size();
            return size <= cmd.maxEvents() ? all : all.subList(size - cmd.maxEvents(), size);
        }
        if (hasValue(cmd.projectId())) {
            List<CaptureEvent> all = new ArrayList<>();
            for (Session s : projectSessions(cmd.projectId(), userId)) {
                all.addAll(captureEventPort.findBySessionIdOrderBySequenceNumberAsc(s.getId()));
            }
            all.sort(Comparator.comparing(CaptureEvent::getReceivedAt));
            return all.size() <= cmd.maxEvents() ? all : all.subList(all.size() - cmd.maxEvents(), all.size());
        }
        return captureEventPort
                .findByUserIdOrderByReceivedAtDesc(userId, PageRequest.of(0, cmd.maxEvents()))
                .getContent();
    }

    private List<FileRecord> fetchFiles(String userId, ContextReconstructCommand cmd) {
        if (hasValue(cmd.sessionId())) {
            return fileRecordPort.findBySessionId(cmd.sessionId()).stream()
                    .filter(f -> f.getUploadStatus() == UploadStatus.COMPLETE)
                    .toList();
        }
        if (hasValue(cmd.projectId())) {
            return projectSessions(cmd.projectId(), userId).stream()
                    .flatMap(s -> fileRecordPort.findBySessionId(s.getId()).stream())
                    .filter(f -> f.getUploadStatus() == UploadStatus.COMPLETE)
                    .limit(cmd.maxFiles())
                    .toList();
        }
        return fileRecordPort.findByUserId(userId).stream()
                .filter(f -> f.getUploadStatus() == UploadStatus.COMPLETE)
                .limit(cmd.maxFiles())
                .toList();
    }

    private List<SemanticMemory> fetchMemories(String userId, ContextReconstructCommand cmd) {
        if (hasValue(cmd.query())) {
            try {
                float[] queryEmbedding = embeddingPort.embed(cmd.query());
                String queryVector = VectorConverter.toVectorString(queryEmbedding);
                return semanticMemoryPort.findNearestByUserId(userId, queryVector, cmd.maxMemories(), 0.65);
            } catch (Exception e) {
                log.warn("Embedding unavailable for query '{}', falling back to recency-based memories: {}",
                        cmd.query(), e.getMessage());
                // fall through to session/project/user-scoped recency fetch
            }
        }
        if (hasValue(cmd.sessionId())) {
            return semanticMemoryPort.findBySessionId(
                    cmd.sessionId(),
                    PageRequest.of(0, cmd.maxMemories()));
        }
        if (hasValue(cmd.projectId())) {
            List<SemanticMemory> all = new ArrayList<>();
            for (Session s : projectSessions(cmd.projectId(), userId)) {
                all.addAll(semanticMemoryPort.findBySessionId(
                        s.getId(), PageRequest.of(0, cmd.maxMemories())));
            }
            return all.size() <= cmd.maxMemories() ? all : all.subList(0, cmd.maxMemories());
        }
        return semanticMemoryPort.findByUserId(userId,
                PageRequest.of(0, cmd.maxMemories(), Sort.by("createdAt").descending()))
                .getContent();
    }

    // Returns all sessions in a project belonging to the given user
    private List<Session> projectSessions(String projectId, String userId) {
        return sessionPort.findByProjectIdAndUserId(projectId, userId, PageRequest.of(0, 200))
                .getContent();
    }

    // ── Segment builders ──────────────────────────────────────────────────────

    private ContextSegment sessionToSegment(Session session) {
        String title = hasValue(session.getTitle()) ? session.getTitle()
                : session.getId().substring(0, Math.min(8, session.getId().length()));
        String content = String.format(
                "Session[%s] platform=%s status=%s started=%s lastActive=%s",
                session.getId(), session.getPlatform(), session.getStatus(),
                session.getStartedAt(), session.getLastActiveAt());
        return new ContextSegment(
                ContextSegmentType.SESSION, session.getId(), content,
                "Session: " + title, 0.9,
                optimizer.estimateTokens(content), session.getStartedAt());
    }

    private List<ContextSegment> eventsToSegments(List<CaptureEvent> events) {
        List<ContextSegment> segments = new ArrayList<>(events.size());
        int total = events.size();
        for (int i = 0; i < total; i++) {
            CaptureEvent event = events.get(i);
            Optional<String> text = EventTextExtractor.extract(event);
            if (text.isEmpty()) continue;
            // Events closer to the end of the list are more recent — higher recency score
            double recency = 0.4 + 0.6 * ((double) (i + 1) / total);
            String content = text.get();
            String summary = event.getEventType().name() + " on " + event.getPlatform().name();
            segments.add(new ContextSegment(
                    ContextSegmentType.EVENT, event.getId(), content,
                    summary, recency,
                    optimizer.estimateTokens(content), event.getReceivedAt()));
        }
        return segments;
    }

    private List<ContextSegment> filesToSegments(List<FileRecord> files, int limit) {
        return files.stream()
                .limit(limit)
                .map(f -> {
                    String content = String.format(
                            "File: %s | type=%s | size=%d bytes | uploaded=%s",
                            f.getOriginalName(), f.getMimeType(), f.getSizeBytes(), f.getCreatedAt());
                    return new ContextSegment(
                            ContextSegmentType.FILE, f.getId(), content,
                            "File: " + f.getOriginalName(), 0.5,
                            optimizer.estimateTokens(content), f.getCreatedAt());
                })
                .toList();
    }

    private List<ContextSegment> memoriesToSegments(List<SemanticMemory> memories) {
        int total = memories.size();
        List<ContextSegment> segments = new ArrayList<>(total);
        for (int i = 0; i < total; i++) {
            SemanticMemory m = memories.get(i);
            // Position encodes similarity rank: index 0 = most similar
            double score = total > 1 ? 1.0 - (0.5 * i / (total - 1)) : 1.0;
            String content = m.getContent();
            String summary = hasValue(m.getSummary()) ? m.getSummary()
                    : m.getMemoryType().name() + " memory";
            segments.add(new ContextSegment(
                    ContextSegmentType.MEMORY, m.getId(), content,
                    summary, score,
                    optimizer.estimateTokens(content), m.getCreatedAt()));
        }
        return segments;
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private String buildCacheKey(String userId, ContextReconstructCommand cmd) {
        return userId + ":"
                + nullToEmpty(cmd.sessionId()) + ":"
                + nullToEmpty(cmd.projectId()) + ":"
                + nullToEmpty(cmd.query()) + ":"
                + cmd.maxEvents() + ":"
                + cmd.maxMemories();
    }

    private static int count(List<ContextSegment> segments, ContextSegmentType type) {
        return (int) segments.stream().filter(s -> s.segmentType() == type).count();
    }

    private static boolean hasValue(String s) {
        return s != null && !s.isBlank();
    }

    private static String nullToEmpty(String s) {
        return s != null ? s : "";
    }
}
