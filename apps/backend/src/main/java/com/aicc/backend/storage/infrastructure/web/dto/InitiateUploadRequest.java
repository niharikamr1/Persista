package com.aicc.backend.storage.infrastructure.web.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;

public record InitiateUploadRequest(
        @NotBlank String originalName,
        @NotBlank String mimeType,
        @Positive long sizeBytes,
        String sessionId,
        String conversationId
) {}
