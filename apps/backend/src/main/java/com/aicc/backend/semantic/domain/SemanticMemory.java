package com.aicc.backend.semantic.domain;

import com.aicc.backend.common.persistence.VectorConverter;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.ColumnTransformer;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;

@Entity
@Table(name = "semantic_memories")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SemanticMemory {

    @Id
    @Column(nullable = false, updatable = false)
    private String id;

    @Column(name = "user_id", nullable = false, updatable = false)
    private String userId;

    @Column(name = "source_event_id", updatable = false)
    private String sourceEventId;

    @Enumerated(EnumType.STRING)
    @Column(name = "memory_type", nullable = false)
    private MemoryType memoryType;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String content;

    @Column(columnDefinition = "TEXT")
    private String summary;

    // float[] ↔ pgvector text "[f1,f2,...,fn]" via VectorConverter
    @ColumnTransformer(write = "?::vector")
    @Convert(converter = VectorConverter.class)
    @Column(name = "embedding", columnDefinition = "vector(384)")
    private float[] embedding;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb")
    @Builder.Default
    private String metadata = "{}";

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;
}
