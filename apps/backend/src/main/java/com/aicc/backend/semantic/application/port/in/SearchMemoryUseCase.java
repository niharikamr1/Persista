package com.aicc.backend.semantic.application.port.in;

import com.aicc.backend.semantic.domain.SemanticMemory;

import java.util.List;

public interface SearchMemoryUseCase {
    List<SemanticMemory> search(String userId, String query, int topK);
}
