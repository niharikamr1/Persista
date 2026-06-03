package com.aicc.backend.sync.application.port.in;

import com.aicc.backend.sync.domain.SyncCheckpoint;

public interface RecordSyncUseCase {
    SyncCheckpoint record(String userId, String platform, String lastSyncedEventId);
}
