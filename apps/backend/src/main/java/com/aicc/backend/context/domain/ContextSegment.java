package com.aicc.backend.context.domain;

import java.time.Instant;

/**
 * A single reconstructed piece of context: one event, memory, file, or session snapshot.
 * relevanceScore: 0.0–1.0 used by the optimizer to rank and trim.
 * tokenCount: approximate token usage (chars / 4) for budget management.
 * tracedAt: original timestamp for semantic traceability.
 */
public record ContextSegment(
        ContextSegmentType segmentType,
        String sourceId,
        String content,
        String summary,
        double relevanceScore,
        int tokenCount,
        Instant tracedAt
) {}
