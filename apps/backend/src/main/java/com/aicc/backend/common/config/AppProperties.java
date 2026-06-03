package com.aicc.backend.common.config;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

@Validated
@ConfigurationProperties(prefix = "aicc")
public record AppProperties(
        Jwt jwt,
        Minio minio,
        Ai ai,
        Encryption encryption
) {
    public record Jwt(
            @NotBlank String secret,
            @Positive long accessExpiryMs,
            @Positive long refreshExpiryMs
    ) {}

    public record Minio(
            @NotBlank String endpoint,
            @NotBlank String accessKey,
            @NotBlank String secretKey,
            @NotBlank String bucket,
            int signedUrlExpirySeconds
    ) {
        public Minio {
            if (signedUrlExpirySeconds <= 0) signedUrlExpirySeconds = 3600;
        }
    }

    public record Ai(
            @NotBlank String openAiApiKey,
            String embeddingModel,
            String chatModel
    ) {
        public String embeddingModel() {
            return embeddingModel != null ? embeddingModel : "text-embedding-3-small";
        }

        public String chatModel() {
            return chatModel != null ? chatModel : "gpt-4o-mini";
        }
    }

    public record Encryption(
            String key
    ) {
        public Encryption() { this(null); }
    }
}
