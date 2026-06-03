package com.aicc.backend.semantic.infrastructure.web;

import com.aicc.backend.common.api.ApiResponse;
import com.aicc.backend.common.api.ApiVersion;
import com.aicc.backend.common.api.PageMeta;
import com.aicc.backend.common.security.CurrentUser;
import com.aicc.backend.semantic.application.port.in.GetMemoryUseCase;
import com.aicc.backend.semantic.application.port.in.SearchMemoryUseCase;
import com.aicc.backend.semantic.application.service.SemanticMemoryService;
import com.aicc.backend.semantic.domain.MemoryType;
import com.aicc.backend.semantic.domain.SemanticMemory;
import com.aicc.backend.semantic.infrastructure.web.dto.MemorySearchRequest;
import com.aicc.backend.semantic.infrastructure.web.dto.SemanticMemoryResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping(ApiVersion.V1_MEMORY)
@RequiredArgsConstructor
public class SemanticMemoryController {

    private final SearchMemoryUseCase searchMemoryUseCase;
    private final GetMemoryUseCase getMemoryUseCase;
    private final SemanticMemoryService semanticMemoryService;

    /**
     * POST /api/v1/memory/search
     * Vector similarity search across the user's semantic memory.
     */
    @PostMapping("/search")
    public ResponseEntity<ApiResponse<List<SemanticMemoryResponse>>> search(
            @CurrentUser String userId,
            @Valid @RequestBody MemorySearchRequest request) {

        List<SemanticMemory> memories;
        if (request.memoryType() != null && !request.memoryType().isBlank()) {
            MemoryType type = parseMemoryType(request.memoryType());
            memories = semanticMemoryService.searchByType(userId, request.query(), type, request.topK());
        } else {
            memories = searchMemoryUseCase.search(userId, request.query(), request.topK());
        }

        List<SemanticMemoryResponse> result = memories.stream()
                .map(SemanticMemoryResponse::from)
                .toList();
        return ResponseEntity.ok(ApiResponse.ok(result));
    }

    /**
     * GET /api/v1/memory
     * Paginated list of memories, optionally filtered by type.
     */
    @GetMapping
    public ResponseEntity<ApiResponse<List<SemanticMemoryResponse>>> listMemories(
            @CurrentUser String userId,
            @RequestParam(required = false) String type,
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC)
            Pageable pageable) {

        MemoryType typeFilter = (type != null && !type.isBlank()) ? parseMemoryType(type) : null;
        Page<SemanticMemory> page = getMemoryUseCase.listByUser(userId, typeFilter, pageable);

        List<SemanticMemoryResponse> content = page.getContent().stream()
                .map(SemanticMemoryResponse::from)
                .toList();
        return ResponseEntity.ok(ApiResponse.paged(content, PageMeta.from(page)));
    }

    /**
     * GET /api/v1/memory/{id}
     */
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<SemanticMemoryResponse>> getMemory(
            @CurrentUser String userId,
            @PathVariable String id) {
        SemanticMemory memory = getMemoryUseCase.getById(id, userId);
        return ResponseEntity.ok(ApiResponse.ok(SemanticMemoryResponse.from(memory)));
    }

    /**
     * DELETE /api/v1/memory/{id}
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteMemory(
            @CurrentUser String userId,
            @PathVariable String id) {
        getMemoryUseCase.delete(id, userId);
        return ResponseEntity.noContent().build();
    }

    private static MemoryType parseMemoryType(String value) {
        try {
            return MemoryType.valueOf(value.toUpperCase().replace("-", "_").replace(" ", "_"));
        } catch (IllegalArgumentException e) {
            return MemoryType.GENERAL;
        }
    }
}
