package com.aicc.backend.context.infrastructure.web;

import com.aicc.backend.common.api.ApiResponse;
import com.aicc.backend.common.api.ApiVersion;
import com.aicc.backend.common.security.CurrentUser;
import com.aicc.backend.context.application.port.in.ReconstructContextUseCase;
import com.aicc.backend.context.domain.ReconstructedContext;
import com.aicc.backend.context.infrastructure.web.dto.ContextReconstructRequest;
import com.aicc.backend.context.infrastructure.web.dto.ReconstructedContextResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping(ApiVersion.V1_CONTEXT)
@RequiredArgsConstructor
public class ContextController {

    private final ReconstructContextUseCase reconstructContextUseCase;

    /**
     * POST /api/v1/context/reconstruct
     * Assembles a portable context package from events, memories, files, and session metadata.
     * Pass cache:true to persist the package for cross-session retrieval.
     */
    @PostMapping("/reconstruct")
    public ResponseEntity<ApiResponse<ReconstructedContextResponse>> reconstruct(
            @CurrentUser String userId,
            @Valid @RequestBody ContextReconstructRequest request) {

        ReconstructedContext ctx = reconstructContextUseCase
                .reconstruct(userId, request.toCommand());
        return ResponseEntity.ok(ApiResponse.ok(ReconstructedContextResponse.from(ctx)));
    }
}
