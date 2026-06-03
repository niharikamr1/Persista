package com.aicc.backend.sync.domain;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;

@Entity
@Table(name = "sync_checkpoints",
       uniqueConstraints = @UniqueConstraint(columnNames = {"user_id", "platform"}))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SyncCheckpoint {

    @Id
    @Column(nullable = false, updatable = false)
    private String id;

    @Column(name = "user_id", nullable = false)
    private String userId;

    @Column(nullable = false)
    private String platform;

    @Column(name = "last_synced_event_id")
    private String lastSyncedEventId;

    @UpdateTimestamp
    @Column(name = "last_synced_at", nullable = false)
    private Instant lastSyncedAt;
}
