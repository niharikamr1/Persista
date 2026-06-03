package com.aicc.backend.sync.infrastructure.web.dto;

import java.time.Instant;
import java.util.List;

public record SyncStatusResponse(
        List<SyncCheckpointResponse> checkpoints,
        Instant serverTime
) {}
