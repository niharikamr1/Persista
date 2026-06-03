package com.aicc.backend.semantic.application.service;

import com.aicc.backend.common.config.CacheConfig;
import com.aicc.backend.common.exception.ApiException;
import com.aicc.backend.common.security.OwnershipValidator;
import com.aicc.backend.common.util.IdGenerator;
import com.aicc.backend.semantic.application.port.in.GetMemoryUseCase;
import com.aicc.backend.semantic.application.port.in.SearchMemoryUseCase;
import com.aicc.backend.semantic.application.port.in.StoreMemoryUseCase;
import com.aicc.backend.semantic.application.port.out.EmbeddingPort;
import com.aicc.backend.semantic.application.port.out.SemanticMemoryPort;
import com.aicc.backend.semantic.domain.MemoryType;
import com.aicc.backend.semantic.domain.SemanticMemory;
import com.aicc.backend.common.persistence.VectorConverter;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class SemanticMemoryService
        implements StoreMemoryUseCase, SearchMemoryUseCase, GetMemoryUseCase {

    // Cosine distance threshold: 0=identical, 2=opposite. Results >= threshold are excluded.
    // 0.65 means we require at least ~67.5% cosine similarity to return a result.
    private static final double DEFAULT_SIMILARITY_THRESHOLD = 0.65;

    private final SemanticMemoryPort semanticMemoryPort;
    private final EmbeddingPort embeddingPort;
    private final OwnershipValidator ownershipValidator;

    // ── Store ─────────────────────────────────────────────────────────────────

    @Override
    @Transactional
    public SemanticMemory store(String userId, String sourceEventId, MemoryType type,
                                String content, String summary) {
        float[] embedding = embeddingPort.embed(content);
        SemanticMemory memory = SemanticMemory.builder()
                .id(IdGenerator.prefixed("mem"))
                .userId(userId)
                .sourceEventId(sourceEventId)
                .memoryType(type)
                .content(content)
                .summary(summary != null && !summary.isBlank() ? summary : null)
                .embedding(embedding)
                .build();
        return semanticMemoryPort.save(memory);
    }

    // ── Search ────────────────────────────────────────────────────────────────

    @Override
    @Transactional(readOnly = true)
    @Cacheable(cacheNames = CacheConfig.SEMANTIC_CACHE,
               key = "#userId + ':' + #query + ':' + #topK")
    public List<SemanticMemory> search(String userId, String query, int topK) {
        float[] queryEmbedding = embeddingPort.embed(query);
        String queryVector = VectorConverter.toVectorString(queryEmbedding);
        return semanticMemoryPort.findNearestByUserId(userId, queryVector, topK, DEFAULT_SIMILARITY_THRESHOLD);
    }

    public List<SemanticMemory> searchByType(String userId, String query,
                                              MemoryType typeFilter, int topK) {
        float[] queryEmbedding = embeddingPort.embed(query);
        String queryVector = VectorConverter.toVectorString(queryEmbedding);
        return semanticMemoryPort.findNearestByUserIdAndMemoryType(
                userId, queryVector, typeFilter, topK, DEFAULT_SIMILARITY_THRESHOLD);
    }

    // ── Get / list ────────────────────────────────────────────────────────────

    @Override
    @Transactional(readOnly = true)
    public SemanticMemory getById(String memoryId, String userId) {
        SemanticMemory memory = semanticMemoryPort.findById(memoryId)
                .orElseThrow(() -> ApiException.notFound("Memory"));
        ownershipValidator.validate(memory.getUserId(), userId);
        return memory;
    }

    @Override
    @Transactional(readOnly = true)
    public Page<SemanticMemory> listByUser(String userId, MemoryType typeFilter, Pageable pageable) {
        if (typeFilter != null) {
            return semanticMemoryPort.findByUserIdAndMemoryType(userId, typeFilter, pageable);
        }
        return semanticMemoryPort.findByUserId(userId, pageable);
    }

    // ── Delete ────────────────────────────────────────────────────────────────

    @Override
    @Transactional
    @CacheEvict(cacheNames = CacheConfig.SEMANTIC_CACHE, allEntries = true)
    public void delete(String memoryId, String userId) {
        SemanticMemory memory = semanticMemoryPort.findById(memoryId)
                .orElseThrow(() -> ApiException.notFound("Memory"));
        ownershipValidator.validate(memory.getUserId(), userId);
        semanticMemoryPort.deleteById(memoryId);
    }
}
