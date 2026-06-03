package com.aicc.backend.storage.infrastructure.minio;

import com.aicc.backend.common.config.AppProperties;
import io.minio.BucketExistsArgs;
import io.minio.MakeBucketArgs;
import io.minio.MinioClient;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class BucketInitializer {

    private final MinioClient minioClient;
    private final AppProperties appProperties;

    @EventListener(ApplicationReadyEvent.class)
    public void ensureBucketExists() {
        String bucket = appProperties.minio().bucket();
        try {
            boolean exists = minioClient.bucketExists(
                    BucketExistsArgs.builder().bucket(bucket).build());
            if (!exists) {
                minioClient.makeBucket(MakeBucketArgs.builder().bucket(bucket).build());
                log.info("Created MinIO bucket: {}", bucket);
            } else {
                log.debug("MinIO bucket ready: {}", bucket);
            }
        } catch (Exception e) {
            log.warn("Could not verify/create MinIO bucket '{}': {}", bucket, e.getMessage());
        }
    }
}
