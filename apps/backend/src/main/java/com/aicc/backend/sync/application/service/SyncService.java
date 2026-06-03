package com.aicc.backend.sync.application.service;

import com.aicc.backend.common.util.IdGenerator;
import com.aicc.backend.sync.application.port.in.RecordSyncUseCase;
import com.aicc.backend.sync.application.port.out.SyncCheckpointPort;
import com.aicc.backend.sync.domain.SyncCheckpoint;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class SyncService implements RecordSyncUseCase {

    private final SyncCheckpointPort checkpointPort;

    @Override
    @Transactional
    public SyncCheckpoint record(String userId, String platform, String lastSyncedEventId) {
        SyncCheckpoint checkpoint = checkpointPort
                .findByUserIdAndPlatform(userId, platform)
                .orElseGet(() -> SyncCheckpoint.builder()
                        .id(IdGenerator.prefixed("sync"))
                        .userId(userId)
                        .platform(platform)
                        .build());
        checkpoint.setLastSyncedEventId(lastSyncedEventId);
        return checkpointPort.save(checkpoint);
    }

    @Transactional(readOnly = true)
    public List<SyncCheckpoint> getCheckpoints(String userId) {
        return checkpointPort.findByUserId(userId);
    }

    @Transactional(readOnly = true)
    public SyncCheckpoint getCheckpoint(String userId, String platform) {
        return checkpointPort.findByUserIdAndPlatform(userId, platform).orElse(null);
    }
}
