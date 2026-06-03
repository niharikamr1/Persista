package com.aicc.backend.common.exception;

import org.springframework.http.HttpStatus;

public class ApiException extends RuntimeException {

    private final ErrorCode errorCode;

    public ApiException(ErrorCode errorCode, String message) {
        super(message);
        this.errorCode = errorCode;
    }

    public ErrorCode getErrorCode() { return errorCode; }
    public HttpStatus getStatus()   { return errorCode.status(); }
    public String getCode()         { return errorCode.name(); }

    // ── Factory methods ───────────────────────────────────────────────────────

    public static ApiException notFound(String resource) {
        return new ApiException(ErrorCode.NOT_FOUND, resource + " not found");
    }

    public static ApiException conflict(String message) {
        return new ApiException(ErrorCode.CONFLICT, message);
    }

    public static ApiException unauthorized(String message) {
        return new ApiException(ErrorCode.UNAUTHORIZED, message);
    }

    public static ApiException forbidden(String message) {
        return new ApiException(ErrorCode.FORBIDDEN, message);
    }

    public static ApiException badRequest(String message) {
        return new ApiException(ErrorCode.BAD_REQUEST, message);
    }

    public static ApiException unprocessable(String message) {
        return new ApiException(ErrorCode.UNPROCESSABLE, message);
    }

    public static ApiException serviceUnavailable(String message) {
        return new ApiException(ErrorCode.SERVICE_UNAVAILABLE, message);
    }
}
