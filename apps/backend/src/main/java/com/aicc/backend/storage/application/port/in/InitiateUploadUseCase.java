package com.aicc.backend.storage.application.port.in;

import com.aicc.backend.storage.domain.FileRecord;

public interface InitiateUploadUseCase {
    FileRecord initiate(String userId, String sessionId, String conversationId,
                        String originalName, String mimeType, long sizeBytes);
}
