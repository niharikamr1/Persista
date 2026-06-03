package com.aicc.backend.common.exception;

import org.springframework.http.HttpStatus;

public enum ErrorCode {

    // ── 400 ──────────────────────────────────────────────────────────────────
    BAD_REQUEST(HttpStatus.BAD_REQUEST),
    VALIDATION_ERROR(HttpStatus.BAD_REQUEST),
    MALFORMED_REQUEST(HttpStatus.BAD_REQUEST),

    // ── 401 / 403 ─────────────────────────────────────────────────────────────
    UNAUTHORIZED(HttpStatus.UNAUTHORIZED),
    FORBIDDEN(HttpStatus.FORBIDDEN),

    // ── 404 / 405 / 409 ───────────────────────────────────────────────────────
    NOT_FOUND(HttpStatus.NOT_FOUND),
    METHOD_NOT_ALLOWED(HttpStatus.METHOD_NOT_ALLOWED),
    CONFLICT(HttpStatus.CONFLICT),

    // ── 422 ──────────────────────────────────────────────────────────────────
    UNPROCESSABLE(HttpStatus.UNPROCESSABLE_ENTITY),

    // ── 429 ──────────────────────────────────────────────────────────────────
    RATE_LIMITED(HttpStatus.TOO_MANY_REQUESTS),

    // ── 5xx ──────────────────────────────────────────────────────────────────
    INTERNAL_ERROR(HttpStatus.INTERNAL_SERVER_ERROR),
    SERVICE_UNAVAILABLE(HttpStatus.SERVICE_UNAVAILABLE);

    private final HttpStatus status;

    ErrorCode(HttpStatus status) {
        this.status = status;
    }

    public HttpStatus status() {
        return status;
    }
}
