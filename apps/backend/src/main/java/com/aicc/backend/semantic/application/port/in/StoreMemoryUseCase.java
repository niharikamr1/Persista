package com.aicc.backend.semantic.application.port.in;

import com.aicc.backend.semantic.domain.MemoryType;
import com.aicc.backend.semantic.domain.SemanticMemory;

public interface StoreMemoryUseCase {
    SemanticMemory store(String userId, String sourceEventId, MemoryType type,
                         String content, String summary);
}
