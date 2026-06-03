package com.aicc.backend.storage.domain;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;

@Entity
@Table(name = "file_records")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FileRecord {

    @Id
    @Column(nullable = false, updatable = false)
    private String id;

    @Column(name = "user_id", nullable = false, updatable = false)
    private String userId;

    @Column(name = "session_id")
    private String sessionId;

    @Column(name = "conversation_id")
    private String conversationId;

    @Column(name = "original_name", nullable = false, updatable = false)
    private String originalName;

    @Column(name = "mime_type", nullable = false, updatable = false)
    private String mimeType;

    @Column(name = "size_bytes", nullable = false, updatable = false)
    private long sizeBytes;

    @Column(name = "object_key", nullable = false, unique = true, updatable = false)
    private String objectKey;

    // Populated after upload completes; null while PENDING/IN_PROGRESS
    @Column
    private String checksum;

    @Enumerated(EnumType.STRING)
    @Column(name = "upload_status", nullable = false)
    @Builder.Default
    private UploadStatus uploadStatus = UploadStatus.PENDING;

    // Set when a MinIO multipart upload is in flight; cleared on completion/failure
    @Column(name = "multipart_upload_id")
    private String multipartUploadId;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;
}
