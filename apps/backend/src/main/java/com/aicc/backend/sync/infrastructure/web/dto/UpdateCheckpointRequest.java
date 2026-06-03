package com.aicc.backend.sync.infrastructure.web.dto;

import jakarta.validation.constraints.NotBlank;

public record UpdateCheckpointRequest(
        @NotBlank String platform,
        @NotBlank String lastSyncedEventId
) {}
