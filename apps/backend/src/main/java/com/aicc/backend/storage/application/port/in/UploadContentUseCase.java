package com.aicc.backend.storage.application.port.in;

import com.aicc.backend.storage.domain.FileRecord;

import java.io.InputStream;

public interface UploadContentUseCase {
    /**
     * Streams bytes to object storage while computing a SHA-256 checksum.
     * Transitions the record PENDING → COMPLETE, or FAILED on error.
     *
     * @param expectedChecksum optional client-provided SHA-256 hex; verified if non-null
     */
    FileRecord uploadContent(String fileId, String userId, InputStream content, String expectedChecksum);
}
