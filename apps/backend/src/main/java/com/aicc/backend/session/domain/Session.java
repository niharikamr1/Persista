package com.aicc.backend.session.domain;

import com.aicc.backend.capture.domain.AIPlatform;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.type.SqlTypes;

import java.time.Instant;

@Entity
@Table(name = "sessions")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Session {

    @Id
    @Column(nullable = false, updatable = false)
    private String id;

    @Column(name = "user_id", nullable = false, updatable = false)
    private String userId;

    @Column(name = "project_id")
    private String projectId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private AIPlatform platform;

    @Column
    private String title;

    @Column(name = "conversation_id")
    private String conversationId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private SessionStatus status = SessionStatus.ACTIVE;

    @CreationTimestamp
    @Column(name = "started_at", nullable = false, updatable = false)
    private Instant startedAt;

    @Column(name = "last_active_at", nullable = false)
    @Builder.Default
    private Instant lastActiveAt = Instant.now();

    @Column(name = "ended_at")
    private Instant endedAt;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb", nullable = false)
    @Builder.Default
    private String metadata = "{}";

    public void end() {
        this.status = SessionStatus.ENDED;
        this.endedAt = Instant.now();
    }

    public void touch() {
        this.lastActiveAt = Instant.now();
    }
}
