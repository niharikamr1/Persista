package com.aicc.backend.session.infrastructure.web.dto;

import com.aicc.backend.capture.domain.AIPlatform;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

/**
 * Session as sent by the browser extension during batch sync.
 * The id is client-generated and used as the server-side PK (allows upsert).
 */
public record SessionWireDto(
        @NotBlank  String id,
        @NotNull   AIPlatform platform,
                   String conversationId,
                   String title,
        @NotNull   Long startedAt,
                   Long lastActiveAt,
                   Long endedAt
) {}
