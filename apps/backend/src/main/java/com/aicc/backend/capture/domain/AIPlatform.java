package com.aicc.backend.capture.domain;

import com.fasterxml.jackson.annotation.JsonCreator;

public enum AIPlatform {
    CHATGPT,
    CLAUDE,
    GEMINI;

    // Accept lowercase values from the browser extension ("chatgpt", "claude", "gemini")
    @JsonCreator
    public static AIPlatform fromValue(String value) {
        return AIPlatform.valueOf(value.toUpperCase());
    }
}
