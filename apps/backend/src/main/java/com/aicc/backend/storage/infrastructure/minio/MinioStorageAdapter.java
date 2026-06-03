package com.aicc.backend.storage.infrastructure.minio;

import com.aicc.backend.common.config.AppProperties;
import com.aicc.backend.common.exception.ApiException;
import com.aicc.backend.storage.application.port.out.ObjectStoragePort;
import io.minio.*;
import io.minio.http.Method;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.io.InputStream;
import java.util.concurrent.TimeUnit;

@Component
@RequiredArgsConstructor
public class MinioStorageAdapter implements ObjectStoragePort {

    private final MinioClient minioClient;
    private final AppProperties appProperties;

    @Override
    public void upload(String objectKey, String mimeType, long sizeBytes, InputStream content) {
        try {
            minioClient.putObject(
                    PutObjectArgs.builder()
                            .bucket(bucket())
                            .object(objectKey)
                            .contentType(mimeType)
                            .stream(content, sizeBytes, -1)
                            .build());
        } catch (Exception e) {
            throw ApiException.serviceUnavailable("Object upload failed [" + objectKey + "]: " + e.getMessage());
        }
    }

    @Override
    public InputStream download(String objectKey) {
        try {
            return minioClient.getObject(
                    GetObjectArgs.builder()
                            .bucket(bucket())
                            .object(objectKey)
                            .build());
        } catch (Exception e) {
            throw ApiException.serviceUnavailable("Object download failed [" + objectKey + "]: " + e.getMessage());
        }
    }

    @Override
    public void delete(String objectKey) {
        try {
            minioClient.removeObject(
                    RemoveObjectArgs.builder()
                            .bucket(bucket())
                            .object(objectKey)
                            .build());
        } catch (Exception e) {
            throw ApiException.serviceUnavailable("Object delete failed [" + objectKey + "]: " + e.getMessage());
        }
    }

    @Override
    public String generateSignedUrl(String objectKey, int expirySeconds) {
        try {
            return minioClient.getPresignedObjectUrl(
                    GetPresignedObjectUrlArgs.builder()
                            .method(Method.GET)
                            .bucket(bucket())
                            .object(objectKey)
                            .expiry(expirySeconds, TimeUnit.SECONDS)
                            .build());
        } catch (Exception e) {
            throw ApiException.serviceUnavailable("Signed URL generation failed [" + objectKey + "]: " + e.getMessage());
        }
    }

    private String bucket() {
        return appProperties.minio().bucket();
    }
}
