package com.aicc.backend.semantic.application.port.in;

import com.aicc.backend.semantic.domain.MemoryType;
import com.aicc.backend.semantic.domain.SemanticMemory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface GetMemoryUseCase {
    SemanticMemory getById(String memoryId, String userId);
    Page<SemanticMemory> listByUser(String userId, MemoryType typeFilter, Pageable pageable);
    void delete(String memoryId, String userId);
}
