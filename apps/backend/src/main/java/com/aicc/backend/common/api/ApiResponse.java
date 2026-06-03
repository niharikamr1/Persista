package com.aicc.backend.common.api;

import com.fasterxml.jackson.annotation.JsonInclude;
import org.slf4j.MDC;

import java.time.Instant;
import java.util.List;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record ApiResponse<T>(
        boolean success,
        T data,
        PageMeta page,
        String requestId,
        Instant timestamp
) {

    public static <T> ApiResponse<T> ok(T data) {
        return new ApiResponse<>(true, data, null, MDC.get("requestId"), Instant.now());
    }

    public static <T> ApiResponse<List<T>> paged(List<T> data, PageMeta meta) {
        return new ApiResponse<>(true, data, meta, MDC.get("requestId"), Instant.now());
    }
}
