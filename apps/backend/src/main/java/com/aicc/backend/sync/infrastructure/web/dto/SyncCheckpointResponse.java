package com.aicc.backend.sync.infrastructure.web.dto;

import com.aicc.backend.sync.domain.SyncCheckpoint;

import java.time.Instant;

public record SyncCheckpointResponse(
        String platform,
        String lastSyncedEventId,
        Instant lastSyncedAt
) {
    public static SyncCheckpointResponse from(SyncCheckpoint cp) {
        return new SyncCheckpointResponse(cp.getPlatform(), cp.getLastSyncedEventId(), cp.getLastSyncedAt());
    }
}
