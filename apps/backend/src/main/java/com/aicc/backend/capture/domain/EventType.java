package com.aicc.backend.capture.domain;

import com.fasterxml.jackson.annotation.JsonCreator;

public enum EventType {
    PROMPT_SENT,
    RESPONSE_RECEIVED,
    FILE_UPLOADED,
    SESSION_STARTED,
    SESSION_ENDED;

    @JsonCreator
    public static EventType fromValue(String value) {
        return EventType.valueOf(value.toUpperCase());
    }
}
