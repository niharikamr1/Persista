package com.aicc.backend.semantic.infrastructure.web.dto;

import com.aicc.backend.semantic.domain.SemanticMemory;

import java.time.Instant;

public record SemanticMemoryResponse(
        String id,
        String userId,
        String sourceEventId,
        String memoryType,
        String content,
        String summary,
        String metadata,
        Instant createdAt
) {
    public static SemanticMemoryResponse from(SemanticMemory m) {
        return new SemanticMemoryResponse(
                m.getId(),
                m.getUserId(),
                m.getSourceEventId(),
                m.getMemoryType().name(),
                m.getContent(),
                m.getSummary(),
                m.getMetadata(),
                m.getCreatedAt()
        );
    }
}
