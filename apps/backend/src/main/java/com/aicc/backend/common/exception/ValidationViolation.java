package com.aicc.backend.common.exception;

import com.fasterxml.jackson.annotation.JsonInclude;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record ValidationViolation(String field, String message, Object rejectedValue) {

    public static ValidationViolation of(String field, String message, Object rejectedValue) {
        return new ValidationViolation(field, message, rejectedValue);
    }

    public static ValidationViolation of(String field, String message) {
        return new ValidationViolation(field, message, null);
    }
}
