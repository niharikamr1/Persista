package com.aicc.backend.storage.infrastructure.web.dto;

import com.aicc.backend.storage.domain.FileRecord;

import java.time.Instant;

public record FileRecordResponse(
        String id,
        String userId,
        String sessionId,
        String conversationId,
        String originalName,
        String mimeType,
        long sizeBytes,
        String checksum,
        String uploadStatus,
        Instant createdAt,
        Instant updatedAt
) {
    public static FileRecordResponse from(FileRecord r) {
        return new FileRecordResponse(
                r.getId(),
                r.getUserId(),
                r.getSessionId(),
                r.getConversationId(),
                r.getOriginalName(),
                r.getMimeType(),
                r.getSizeBytes(),
                r.getChecksum(),
                r.getUploadStatus().name(),
                r.getCreatedAt(),
                r.getUpdatedAt()
        );
    }
}
