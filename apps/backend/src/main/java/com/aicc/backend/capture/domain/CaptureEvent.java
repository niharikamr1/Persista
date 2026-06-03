package com.aicc.backend.capture.domain;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.Immutable;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;

/**
 * Append-only event record — never updated after insert.
 * id and sequenceNumber are set by the application layer before save;
 * all other fields are immutable once persisted.
 */
@Entity
@Immutable
@Table(name = "capture_events")
@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CaptureEvent {

    @Id
    @Setter
    @Column(nullable = false, updatable = false)
    private String id;

    @Column(name = "session_id", nullable = false, updatable = false)
    private String sessionId;

    @Column(name = "user_id", nullable = false, updatable = false)
    private String userId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, updatable = false)
    private AIPlatform platform;

    @Enumerated(EnumType.STRING)
    @Column(name = "event_type", nullable = false, updatable = false)
    private EventType eventType;

    @Column(name = "conversation_id", updatable = false)
    private String conversationId;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(nullable = false, columnDefinition = "jsonb", updatable = false)
    @Builder.Default
    private String payload = "{}";

    @Column(name = "client_timestamp", nullable = false, updatable = false)
    private Instant clientTimestamp;

    @CreationTimestamp
    @Column(name = "received_at", nullable = false, updatable = false)
    private Instant receivedAt;

    @Setter
    @Column(name = "sequence_number", nullable = false, updatable = false)
    private long sequenceNumber;
}
