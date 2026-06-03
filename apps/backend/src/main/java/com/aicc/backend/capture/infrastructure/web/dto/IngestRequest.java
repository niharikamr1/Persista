package com.aicc.backend.capture.infrastructure.web.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;

import java.util.List;

public record IngestRequest(
        @NotEmpty @Size(max = 100, message = "Batch size must not exceed 100 events")
        List<@Valid EventWireDto> events
) {}
