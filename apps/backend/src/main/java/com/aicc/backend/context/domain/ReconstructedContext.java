package com.aicc.backend.context.domain;

import java.time.Instant;
import java.util.List;

/**
 * A fully assembled, optimised context package ready for AI model consumption.
 * Not a JPA entity — purely a domain value object returned by the reconstruction pipeline.
 */
public record ReconstructedContext(
        String packageId,
        String userId,
        String sessionId,
        String projectId,
        String query,
        List<ContextSegment> segments,
        int totalTokens,
        int eventCount,
        int memoryCount,
        int fileCount,
        Instant reconstructedAt
) {}
