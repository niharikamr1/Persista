package com.aicc.backend.capture.infrastructure.web.dto;

import com.aicc.backend.capture.domain.AIPlatform;
import com.aicc.backend.capture.domain.EventType;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.JsonNode;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

/**
 * Single event as sent by the browser extension over the wire.
 *
 * Notes:
 *  - platform arrives as lowercase ("chatgpt") — AIPlatform.fromValue() normalises it
 *  - type maps to the JSON field "type" (extension uses "type", not "eventType")
 *  - timestamp is epoch-milliseconds
 *  - payload is a raw JSON object stored as JSONB on the backend
 */
public record EventWireDto(
        @NotBlank  String id,
        @NotBlank  String sessionId,
                   String conversationId,
        @NotNull   AIPlatform platform,
        @NotNull   @JsonProperty("type") EventType eventType,
        @NotNull   Long timestamp,
        @NotNull   JsonNode payload
) {}
