package com.aicc.backend.common.health;

import com.aicc.backend.common.config.AppProperties;
import io.minio.BucketExistsArgs;
import io.minio.MinioClient;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.actuate.health.Health;
import org.springframework.boot.actuate.health.HealthIndicator;
import org.springframework.stereotype.Component;

@Component("minio")
@RequiredArgsConstructor
public class MinioHealthIndicator implements HealthIndicator {

    private final MinioClient minioClient;
    private final AppProperties properties;

    @Override
    public Health health() {
        String bucket = properties.minio().bucket();
        try {
            boolean exists = minioClient.bucketExists(
                    BucketExistsArgs.builder().bucket(bucket).build());
            if (exists) {
                return Health.up()
                        .withDetail("bucket", bucket)
                        .build();
            }
            return Health.down()
                    .withDetail("bucket", bucket)
                    .withDetail("reason", "bucket not found")
                    .build();
        } catch (Exception ex) {
            return Health.down()
                    .withDetail("bucket", bucket)
                    .withException(ex)
                    .build();
        }
    }
}
