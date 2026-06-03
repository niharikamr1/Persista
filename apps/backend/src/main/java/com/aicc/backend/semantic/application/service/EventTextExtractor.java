package com.aicc.backend.semantic.application.service;

import com.aicc.backend.capture.domain.CaptureEvent;
import com.aicc.backend.capture.domain.EventType;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.util.List;
import java.util.Optional;

public final class EventTextExtractor {

    // Candidate field names searched in order within the payload JSON
    private static final List<String> CANDIDATE_FIELDS =
            List.of("text", "content", "prompt", "response", "message", "body");

    private static final ObjectMapper MAPPER = new ObjectMapper();

    private EventTextExtractor() {}

    /**
     * Extracts human-readable text from a capture event's payload.
     * Returns empty if the event type is not a conversation turn or no text is found.
     */
    public static Optional<String> extract(CaptureEvent event) {
        EventType type = event.getEventType();
        if (type != EventType.PROMPT_SENT && type != EventType.RESPONSE_RECEIVED) {
            return Optional.empty();
        }
        return extractFromJson(event.getPayload());
    }

    private static Optional<String> extractFromJson(String payloadJson) {
        if (payloadJson == null || payloadJson.isBlank()) return Optional.empty();
        try {
            JsonNode node = MAPPER.readTree(payloadJson);
            for (String field : CANDIDATE_FIELDS) {
                JsonNode candidate = node.get(field);
                if (candidate != null && candidate.isTextual()) {
                    String value = candidate.asText().strip();
                    if (!value.isEmpty()) return Optional.of(value);
                }
            }
            // Fallback: use the raw JSON string if it contains something useful
            if (!payloadJson.equals("{}") && payloadJson.length() > 4) {
                return Optional.of(payloadJson);
            }
        } catch (Exception ignored) {}
        return Optional.empty();
    }
}
