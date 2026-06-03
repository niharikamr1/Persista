package com.aicc.backend.storage.application.port.in;

import com.aicc.backend.storage.domain.FileRecord;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.io.InputStream;

public interface GetFileUseCase {
    FileRecord getRecord(String fileId, String userId);
    InputStream download(String fileId, String userId);
    String getSignedUrl(String fileId, String userId);
    Page<FileRecord> listByUser(String userId, Pageable pageable);
}
