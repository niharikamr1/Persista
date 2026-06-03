package com.aicc.backend.session.application.service;

import com.aicc.backend.capture.application.port.out.CaptureEventPort;
import com.aicc.backend.capture.domain.AIPlatform;
import com.aicc.backend.common.exception.ApiException;
import com.aicc.backend.common.util.IdGenerator;
import com.aicc.backend.semantic.application.port.out.SemanticMemoryPort;
import com.aicc.backend.session.application.port.in.CreateSessionUseCase;
import com.aicc.backend.session.application.port.in.GetSessionUseCase;
import com.aicc.backend.session.application.port.out.SessionPort;
import com.aicc.backend.session.domain.Session;
import com.aicc.backend.session.domain.SessionStatus;
import com.aicc.backend.session.infrastructure.web.dto.SessionWireDto;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;

@Service
@RequiredArgsConstructor
public class SessionService implements CreateSessionUseCase, GetSessionUseCase {

    private final SessionPort sessionPort;
    private final SemanticMemoryPort semanticMemoryPort;
    private final CaptureEventPort captureEventPort;

    @Override
    @Transactional
    public Session create(String userId, AIPlatform platform, String title,
                          String conversationId, String projectId) {
        Session session = Session.builder()
                .id(IdGenerator.prefixed("sess"))
                .userId(userId)
                .platform(platform)
                .title(title != null ? title : "New conversation")
                .conversationId(conversationId)
                .projectId(projectId)
                .build();
        return sessionPort.save(session);
    }

    @Override
    @Transactional(readOnly = true)
    public Session getById(String sessionId, String userId) {
        return sessionPort.findByIdAndUserId(sessionId, userId)
                .orElseThrow(() -> ApiException.notFound("Session not found"));
    }

    @Transactional(readOnly = true)
    public Page<Session> searchByUser(String userId, String query, Pageable pageable) {
        return sessionPort.findByUserIdAndTitleContainingIgnoreCase(userId, query, pageable);
    }

    @Transactional(readOnly = true)
    public Page<Session> listByProject(String projectId, String userId, Pageable pageable) {
        return sessionPort.findByProjectIdAndUserId(projectId, userId, pageable);
    }

    @Transactional
    public Session assignToProject(String sessionId, String userId, String projectId) {
        Session session = getById(sessionId, userId);
        session.setProjectId(projectId); // null = unassign
        return sessionPort.save(session);
    }

    @Transactional
    public void delete(String sessionId, String userId) {
        sessionPort.findByIdAndUserId(sessionId, userId)
                .orElseThrow(() -> ApiException.notFound("Session not found"));
        // Delete in FK order:
        // 1. semantic_memories whose source_event_id points into this session's events
        semanticMemoryPort.deleteBySessionId(sessionId);
        // 2. capture_events (cascades processing_jobs automatically)
        captureEventPort.deleteBySessionId(sessionId);
        // 3. the session itself
        sessionPort.deleteById(sessionId);
    }

    @Transactional
    public Session rename(String sessionId, String userId, String newTitle) {
        Session session = getById(sessionId, userId);
        session.setTitle(newTitle.isBlank() ? "New conversation" : newTitle.trim());
        return sessionPort.save(session);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<Session> listByUser(String userId, Pageable pageable) {
        return sessionPort.findByUserId(userId, pageable);
    }

    /**
     * Upsert a batch of sessions sent by the browser extension.
     *
     * New sessions are created with the client-supplied ID (preserving the local reference).
     * Existing sessions (same ID, same user) have their mutable fields updated.
     * Sessions belonging to a different user are silently skipped.
     */
    @Transactional
    public int batchUpsert(List<SessionWireDto> dtos, String userId) {
        int count = 0;
        for (SessionWireDto dto : dtos) {
            Session session = sessionPort.findById(dto.id())
                    .map(existing -> {
                        // Reject updates to sessions owned by another user
                        if (!userId.equals(existing.getUserId())) return existing;
                        existing.setConversationId(dto.conversationId());
                        if (dto.title() != null) existing.setTitle(dto.title());
                        if (dto.lastActiveAt() != null)
                            existing.setLastActiveAt(Instant.ofEpochMilli(dto.lastActiveAt()));
                        if (dto.endedAt() != null) {
                            existing.setEndedAt(Instant.ofEpochMilli(dto.endedAt()));
                            existing.setStatus(SessionStatus.ENDED);
                        }
                        return existing;
                    })
                    .orElseGet(() -> buildNewSession(dto, userId));

            // Only save if it belongs to this user
            if (userId.equals(session.getUserId())) {
                sessionPort.save(session);
                count++;
            }
        }
        return count;
    }

    private Session buildNewSession(SessionWireDto dto, String userId) {
        Instant started   = Instant.ofEpochMilli(dto.startedAt());
        Instant lastActive = dto.lastActiveAt() != null
                ? Instant.ofEpochMilli(dto.lastActiveAt()) : started;
        Instant ended      = dto.endedAt() != null
                ? Instant.ofEpochMilli(dto.endedAt()) : null;

        return Session.builder()
                .id(dto.id())
                .userId(userId)
                .platform(dto.platform())
                .conversationId(dto.conversationId())
                .title(dto.title() != null ? dto.title() : "New conversation")
                .startedAt(started)
                .lastActiveAt(lastActive)
                .endedAt(ended)
                .status(ended != null ? SessionStatus.ENDED : SessionStatus.ACTIVE)
                .build();
    }
}
