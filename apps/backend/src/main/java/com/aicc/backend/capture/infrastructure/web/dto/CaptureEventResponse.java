package com.aicc.backend.capture.infrastructure.web.dto;

import com.aicc.backend.capture.domain.CaptureEvent;

import java.time.Instant;

public record CaptureEventResponse(
        String id,
        String sessionId,
        String eventType,
        String platform,
        long sequenceNumber,
        Instant clientTimestamp,
        Instant receivedAt,
        String payload
) {
    public static CaptureEventResponse from(CaptureEvent e) {
        return new CaptureEventResponse(
                e.getId(),
                e.getSessionId(),
                e.getEventType().name(),
                e.getPlatform().name(),
                e.getSequenceNumber(),
                e.getClientTimestamp(),
                e.getReceivedAt(),
                e.getPayload()
        );
    }
}
