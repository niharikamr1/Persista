package com.aicc.backend.semantic.infrastructure.web.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;

public record MemorySearchRequest(
        @NotBlank String query,
        @Min(1) @Max(50) int topK,
        String memoryType   // optional filter — must match a MemoryType name if provided
) {
    public MemorySearchRequest {
        if (topK == 0) topK = 10; // default when not supplied
    }
}
