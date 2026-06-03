package com.aicc.backend.context.infrastructure.web.dto;

import com.aicc.backend.context.domain.ContextSegment;

import java.time.Instant;

public record ContextSegmentDto(
        String segmentType,
        String sourceId,
        String content,
        String summary,
        double relevanceScore,
        int tokenCount,
        Instant tracedAt
) {
    public static ContextSegmentDto from(ContextSegment seg) {
        return new ContextSegmentDto(
                seg.segmentType().name(),
                seg.sourceId(),
                seg.content(),
                seg.summary(),
                seg.relevanceScore(),
                seg.tokenCount(),
                seg.tracedAt()
        );
    }
}
