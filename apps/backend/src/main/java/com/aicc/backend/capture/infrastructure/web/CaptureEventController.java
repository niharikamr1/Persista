package com.aicc.backend.capture.infrastructure.web;

import com.aicc.backend.capture.application.BatchIngestResult;
import com.aicc.backend.capture.application.port.in.IngestEventsUseCase;
import com.aicc.backend.capture.application.service.IngestRateLimiter;
import com.aicc.backend.capture.domain.AIPlatform;
import com.aicc.backend.capture.domain.CaptureEvent;
import com.aicc.backend.capture.infrastructure.web.dto.EventWireDto;
import com.aicc.backend.capture.infrastructure.web.dto.IngestRequest;
import com.aicc.backend.capture.infrastructure.web.dto.IngestResponse;
import com.aicc.backend.common.api.ApiResponse;
import com.aicc.backend.common.api.ApiVersion;
import com.aicc.backend.common.security.CurrentUser;
import com.aicc.backend.sync.application.port.in.RecordSyncUseCase;
import com.fasterxml.jackson.databind.JsonNode;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping(ApiVersion.V1_EVENTS)
@RequiredArgsConstructor
public class CaptureEventController {

    private final IngestEventsUseCase ingestEventsUseCase;
    private final RecordSyncUseCase recordSyncUseCase;
    private final IngestRateLimiter ingestRateLimiter;

    /**
     * Idempotent batch ingest — the primary extension→backend sync endpoint.
     *
     * Accepts up to 100 events per request.
     * Returns per-event accepted/duplicate classification and the new checkpoint.
     * After ingest, advances the per-platform sync checkpoint automatically.
     *
     * Rate limited to 200 events/minute per authenticated user.
     * Excess requests are rejected with 429 Too Many Requests.
     */
    @PostMapping("/ingest")
    public ResponseEntity<ApiResponse<IngestResponse>> ingest(
            @CurrentUser String userId,
            @Valid @RequestBody IngestRequest request) {

        ingestRateLimiter.check(userId);

        List<CaptureEvent> events = request.events().stream()
                .map(dto -> toEvent(dto, userId))
                .toList();

        BatchIngestResult result = ingestEventsUseCase.ingestBatch(events);

        // Advance checkpoint per platform for events that were accepted
        if (result.newCheckpoint() != null && !request.events().isEmpty()) {
            advanceCheckpoints(result, request.events(), userId);
        }

        return ResponseEntity.ok(ApiResponse.ok(IngestResponse.from(result)));
    }

    // ── Helpers ────────────────────────────────────────────────────────────────

    private CaptureEvent toEvent(EventWireDto dto, String userId) {
        String conversationId = resolveConversationId(dto);
        return CaptureEvent.builder()
                .id(dto.id())
                .sessionId(dto.sessionId())
                .userId(userId)
                .platform(dto.platform())
                .eventType(dto.eventType())
                .conversationId(conversationId)
                .clientTimestamp(Instant.ofEpochMilli(dto.timestamp()))
                .payload(dto.payload().toString())
                .build();
    }

    private String resolveConversationId(EventWireDto dto) {
        if (dto.conversationId() != null && !dto.conversationId().isBlank()) {
            return dto.conversationId();
        }
        JsonNode node = dto.payload().get("conversationId");
        if (node != null && !node.isNull()) return node.asText();
        return null;
    }

    private void advanceCheckpoints(
            BatchIngestResult result,
            List<EventWireDto> wireEvents,
            String userId) {
        // Group accepted IDs by platform so each platform's checkpoint advances independently
        Map<AIPlatform, String> lastAcceptedByPlatform = wireEvents.stream()
                .filter(e -> result.accepted().contains(e.id()))
                .collect(Collectors.toMap(
                        EventWireDto::platform,
                        EventWireDto::id,
                        (existing, replacement) -> replacement  // keep latest
                ));

        lastAcceptedByPlatform.forEach((platform, lastId) ->
                recordSyncUseCase.record(userId, platform.name(), lastId));
    }
}
