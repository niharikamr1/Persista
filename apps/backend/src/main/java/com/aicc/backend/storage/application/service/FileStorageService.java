package com.aicc.backend.storage.application.service;

import com.aicc.backend.common.config.AppProperties;
import com.aicc.backend.common.exception.ApiException;
import com.aicc.backend.common.security.OwnershipValidator;
import com.aicc.backend.common.util.IdGenerator;
import com.aicc.backend.storage.application.port.in.*;
import com.aicc.backend.storage.application.port.out.FileRecordPort;
import com.aicc.backend.storage.application.port.out.ObjectStoragePort;
import com.aicc.backend.storage.domain.FileRecord;
import com.aicc.backend.storage.domain.UploadStatus;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.io.InputStream;
import java.security.DigestInputStream;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;

@Service
@RequiredArgsConstructor
@Slf4j
public class FileStorageService implements InitiateUploadUseCase, UploadContentUseCase,
        GetFileUseCase, DeleteFileUseCase {

    private final ObjectStoragePort objectStoragePort;
    private final FileRecordPort fileRecordPort;
    private final AppProperties appProperties;
    private final OwnershipValidator ownershipValidator;

    // ── Initiate ──────────────────────────────────────────────────────────────

    @Override
    @Transactional
    public FileRecord initiate(String userId, String sessionId, String conversationId,
                               String originalName, String mimeType, long sizeBytes) {
        String fileId = IdGenerator.prefixed("file");
        String objectKey = buildObjectKey(userId, fileId, originalName);
        FileRecord record = FileRecord.builder()
                .id(fileId)
                .userId(userId)
                .sessionId(sessionId)
                .conversationId(conversationId)
                .originalName(originalName)
                .mimeType(mimeType)
                .sizeBytes(sizeBytes)
                .objectKey(objectKey)
                .build();
        return fileRecordPort.save(record);
    }

    // ── Upload content ────────────────────────────────────────────────────────

    @Override
    @Transactional(noRollbackFor = ApiException.class)
    public FileRecord uploadContent(String fileId, String userId,
                                    InputStream content, String expectedChecksum) {
        FileRecord record = findAndValidateOwnership(fileId, userId);

        if (record.getUploadStatus() == UploadStatus.COMPLETE) {
            throw ApiException.conflict("File already uploaded");
        }

        String checksum = computeChecksumAndUpload(record, content);

        if (expectedChecksum != null && !expectedChecksum.isBlank()
                && !expectedChecksum.equalsIgnoreCase(checksum)) {
            safeDelete(record.getObjectKey());
            record.setUploadStatus(UploadStatus.FAILED);
            fileRecordPort.save(record);
            throw ApiException.unprocessable(
                    "Checksum mismatch — expected " + expectedChecksum + ", got " + checksum);
        }

        record.setChecksum(checksum);
        record.setUploadStatus(UploadStatus.COMPLETE);
        record.setMultipartUploadId(null);
        return fileRecordPort.save(record);
    }

    // ── Read ──────────────────────────────────────────────────────────────────

    @Override
    @Transactional(readOnly = true)
    public FileRecord getRecord(String fileId, String userId) {
        return findAndValidateOwnership(fileId, userId);
    }

    @Override
    @Transactional(readOnly = true)
    public InputStream download(String fileId, String userId) {
        FileRecord record = findAndValidateOwnership(fileId, userId);
        requireComplete(record);
        return objectStoragePort.download(record.getObjectKey());
    }

    @Override
    @Transactional(readOnly = true)
    public String getSignedUrl(String fileId, String userId) {
        FileRecord record = findAndValidateOwnership(fileId, userId);
        requireComplete(record);
        int expiry = appProperties.minio().signedUrlExpirySeconds();
        return objectStoragePort.generateSignedUrl(record.getObjectKey(), expiry);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<FileRecord> listByUser(String userId, Pageable pageable) {
        return fileRecordPort.findByUserId(userId, pageable);
    }

    // ── Delete ────────────────────────────────────────────────────────────────

    @Override
    @Transactional
    public void delete(String fileId, String userId) {
        FileRecord record = findAndValidateOwnership(fileId, userId);
        if (record.getUploadStatus() == UploadStatus.COMPLETE) {
            safeDelete(record.getObjectKey());
        }
        fileRecordPort.delete(record);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private FileRecord findAndValidateOwnership(String fileId, String userId) {
        FileRecord record = fileRecordPort.findById(fileId)
                .orElseThrow(() -> ApiException.notFound("File"));
        ownershipValidator.validate(record.getUserId(), userId);
        return record;
    }

    private void requireComplete(FileRecord record) {
        if (record.getUploadStatus() != UploadStatus.COMPLETE) {
            throw ApiException.unprocessable("File upload is not complete");
        }
    }

    private String computeChecksumAndUpload(FileRecord record, InputStream content) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            try (DigestInputStream dis = new DigestInputStream(content, digest)) {
                objectStoragePort.upload(
                        record.getObjectKey(), record.getMimeType(), record.getSizeBytes(), dis);
            }
            return HexFormat.of().formatHex(digest.digest());
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 not available", e);
        } catch (IOException e) {
            throw ApiException.serviceUnavailable("Upload stream error: " + e.getMessage());
        }
    }

    private void safeDelete(String objectKey) {
        try {
            objectStoragePort.delete(objectKey);
        } catch (Exception e) {
            log.warn("Could not delete object '{}': {}", objectKey, e.getMessage());
        }
    }

    private static String buildObjectKey(String userId, String fileId, String originalName) {
        String sanitized = originalName.replaceAll("[^a-zA-Z0-9._\\-]", "_");
        return userId + "/" + fileId + "/" + sanitized;
    }
}
