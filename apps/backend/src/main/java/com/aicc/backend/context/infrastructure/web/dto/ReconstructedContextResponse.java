package com.aicc.backend.context.infrastructure.web.dto;

import com.aicc.backend.context.domain.ReconstructedContext;

import java.time.Instant;
import java.util.List;

public record ReconstructedContextResponse(
        String packageId,
        String userId,
        String sessionId,
        String projectId,
        String query,
        List<ContextSegmentDto> segments,
        int totalTokens,
        int eventCount,
        int memoryCount,
        int fileCount,
        Instant reconstructedAt
) {
    public static ReconstructedContextResponse from(ReconstructedContext ctx) {
        return new ReconstructedContextResponse(
                ctx.packageId(),
                ctx.userId(),
                ctx.sessionId(),
                ctx.projectId(),
                ctx.query(),
                ctx.segments().stream().map(ContextSegmentDto::from).toList(),
                ctx.totalTokens(),
                ctx.eventCount(),
                ctx.memoryCount(),
                ctx.fileCount(),
                ctx.reconstructedAt()
        );
    }
}
