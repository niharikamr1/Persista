package com.aicc.backend.storage.application.port.in;

public interface DeleteFileUseCase {
    void delete(String fileId, String userId);
}
