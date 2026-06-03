package com.aicc.backend.common.config;

import io.minio.MinioClient;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
@RequiredArgsConstructor
public class MinioConfig {

    private final AppProperties properties;

    @Bean
    public MinioClient minioClient() {
        AppProperties.Minio minio = properties.minio();
        return MinioClient.builder()
                .endpoint(minio.endpoint())
                .credentials(minio.accessKey(), minio.secretKey())
                .build();
    }
}
