package com.aicc.backend.sync.infrastructure.persistence;

import com.aicc.backend.sync.application.port.out.SyncCheckpointPort;
import com.aicc.backend.sync.domain.SyncCheckpoint;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SyncCheckpointJpaRepository
        extends JpaRepository<SyncCheckpoint, String>, SyncCheckpointPort {

    Optional<SyncCheckpoint> findByUserIdAndPlatform(String userId, String platform);

    List<SyncCheckpoint> findByUserId(String userId);
}
