package com.aicc.backend.session.infrastructure.web.dto;

import com.aicc.backend.session.domain.Session;

import java.time.Instant;

public record SessionResponse(
        String id,
        String userId,
        String projectId,
        String platform,
        String title,
        String conversationId,
        String status,
        Instant startedAt,
        Instant lastActiveAt,
        Instant endedAt,
        int eventCount
) {
    /** Used by single-session endpoints (detail, rename, project assign) where count is not needed. */
    public static SessionResponse from(Session s) {
        return from(s, 0);
    }

    /** Used by the list endpoint, which fetches all counts in a single batch query. */
    public static SessionResponse from(Session s, int eventCount) {
        return new SessionResponse(
                s.getId(),
                s.getUserId(),
                s.getProjectId(),
                s.getPlatform().name(),
                s.getTitle(),
                s.getConversationId(),
                s.getStatus().name(),
                s.getStartedAt(),
                s.getLastActiveAt(),
                s.getEndedAt(),
                eventCount
        );
    }
}
