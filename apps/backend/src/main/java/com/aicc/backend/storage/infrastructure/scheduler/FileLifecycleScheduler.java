package com.aicc.backend.storage.infrastructure.scheduler;

import com.aicc.backend.storage.application.port.out.FileRecordPort;
import com.aicc.backend.storage.application.port.out.ObjectStoragePort;
import com.aicc.backend.storage.domain.FileRecord;
import com.aicc.backend.storage.domain.UploadStatus;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class FileLifecycleScheduler {

    private static final int STALE_UPLOAD_HOURS = 24;
    private static final int FAILED_RETENTION_DAYS = 30;

    private final FileRecordPort fileRecordPort;
    private final ObjectStoragePort objectStoragePort;

    /**
     * Marks stale PENDING/IN_PROGRESS uploads as FAILED after 24 hours.
     * Purges FAILED records (and any lingering objects) older than 30 days.
     * Runs 1 hour after the previous execution completes.
     */
    @Scheduled(fixedDelay = 3_600_000)
    @Transactional
    public void cleanupStaleUploads() {
        markStaleAsFailed();
        purgeOldFailedRecords();
    }

    private void markStaleAsFailed() {
        Instant threshold = Instant.now().minus(STALE_UPLOAD_HOURS, ChronoUnit.HOURS);
        List<FileRecord> stale = fileRecordPort.findByUploadStatusInAndCreatedAtBefore(
                List.of(UploadStatus.PENDING, UploadStatus.IN_PROGRESS), threshold);

        for (FileRecord record : stale) {
            safeDeleteObject(record.getObjectKey());
            record.setUploadStatus(UploadStatus.FAILED);
            fileRecordPort.save(record);
        }

        if (!stale.isEmpty()) {
            log.info("Lifecycle: marked {} stale upload(s) as FAILED", stale.size());
        }
    }

    private void purgeOldFailedRecords() {
        Instant threshold = Instant.now().minus(FAILED_RETENTION_DAYS, ChronoUnit.DAYS);
        List<FileRecord> old = fileRecordPort.findByUploadStatusInAndCreatedAtBefore(
                List.of(UploadStatus.FAILED), threshold);

        for (FileRecord record : old) {
            safeDeleteObject(record.getObjectKey());
            fileRecordPort.delete(record);
        }

        if (!old.isEmpty()) {
            log.info("Lifecycle: purged {} old FAILED record(s)", old.size());
        }
    }

    private void safeDeleteObject(String objectKey) {
        try {
            objectStoragePort.delete(objectKey);
        } catch (Exception e) {
            log.debug("Could not delete object '{}' during cleanup: {}", objectKey, e.getMessage());
        }
    }
}
