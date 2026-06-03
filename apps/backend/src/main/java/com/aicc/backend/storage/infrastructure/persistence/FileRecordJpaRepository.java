package com.aicc.backend.storage.infrastructure.persistence;

import com.aicc.backend.storage.application.port.out.FileRecordPort;
import com.aicc.backend.storage.domain.FileRecord;
import com.aicc.backend.storage.domain.UploadStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

@Repository
public interface FileRecordJpaRepository
        extends JpaRepository<FileRecord, String>, FileRecordPort {

    Optional<FileRecord> findById(String id);

    List<FileRecord> findByUserId(String userId);

    Page<FileRecord> findByUserId(String userId, Pageable pageable);

    List<FileRecord> findBySessionId(String sessionId);

    List<FileRecord> findByUploadStatusInAndCreatedAtBefore(List<UploadStatus> statuses, Instant threshold);
}
