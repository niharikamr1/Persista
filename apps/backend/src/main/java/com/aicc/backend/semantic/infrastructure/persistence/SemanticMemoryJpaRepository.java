package com.aicc.backend.semantic.infrastructure.persistence;

import com.aicc.backend.semantic.application.port.out.SemanticMemoryPort;
import com.aicc.backend.semantic.domain.MemoryType;
import com.aicc.backend.semantic.domain.SemanticMemory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SemanticMemoryJpaRepository
        extends JpaRepository<SemanticMemory, String>, SemanticMemoryPort {

    Optional<SemanticMemory> findById(String id);

    Page<SemanticMemory> findByUserId(String userId, Pageable pageable);

    Page<SemanticMemory> findByUserIdAndMemoryType(String userId, MemoryType memoryType, Pageable pageable);

    // Memories scoped to a single session via their source event
    @Query(value = """
            SELECT sm.* FROM semantic_memories sm
            JOIN capture_events ce ON sm.source_event_id = ce.id
            WHERE ce.session_id = :sessionId
            ORDER BY sm.created_at DESC
            """, nativeQuery = true)
    List<SemanticMemory> findBySessionId(
            @Param("sessionId") String sessionId,
            Pageable pageable);

    @Modifying
    @Query(value = """
            DELETE FROM semantic_memories
            WHERE source_event_id IN (
                SELECT id FROM capture_events WHERE session_id = :sessionId
            )
            """, nativeQuery = true)
    void deleteBySessionId(@Param("sessionId") String sessionId);

    // HNSW cosine similarity search via pgvector <=> operator — all types
    @Query(value = """
            SELECT * FROM semantic_memories
            WHERE user_id = :userId
              AND (embedding <=> CAST(:queryVector AS vector)) < :threshold
            ORDER BY embedding <=> CAST(:queryVector AS vector)
            LIMIT :topK
            """, nativeQuery = true)
    List<SemanticMemory> findNearestByUserId(
            @Param("userId") String userId,
            @Param("queryVector") String queryVector,
            @Param("topK") int topK,
            @Param("threshold") double threshold);

    // HNSW cosine similarity search filtered by memory type
    @Query(value = """
            SELECT * FROM semantic_memories
            WHERE user_id = :userId AND memory_type = :#{#memoryType.name()}
              AND (embedding <=> CAST(:queryVector AS vector)) < :threshold
            ORDER BY embedding <=> CAST(:queryVector AS vector)
            LIMIT :topK
            """, nativeQuery = true)
    List<SemanticMemory> findNearestByUserIdAndMemoryType(
            @Param("userId") String userId,
            @Param("queryVector") String queryVector,
            @Param("memoryType") MemoryType memoryType,
            @Param("topK") int topK,
            @Param("threshold") double threshold);
}
