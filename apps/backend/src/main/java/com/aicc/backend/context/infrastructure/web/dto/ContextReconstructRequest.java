package com.aicc.backend.context.infrastructure.web.dto;

import com.aicc.backend.context.application.ContextReconstructCommand;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;

public record ContextReconstructRequest(
        String sessionId,
        String projectId,
        String conversationId,
        String platform,
        String query,
        @Min(1) @Max(200)     int maxEvents,
        @Min(1) @Max(100)     int maxMemories,
        @Min(1) @Max(20)      int maxFiles,
        @Min(100) @Max(32000) int tokenBudget,
        boolean cache
) {
    public ContextReconstructRequest {
        if (maxEvents   <= 0) maxEvents   = 20;
        if (maxMemories <= 0) maxMemories = 10;
        if (maxFiles    <= 0) maxFiles    = 5;
        if (tokenBudget <= 0) tokenBudget = 8000;
    }

    public ContextReconstructCommand toCommand() {
        return new ContextReconstructCommand(sessionId, projectId, conversationId, platform, query,
                maxEvents, maxMemories, maxFiles, tokenBudget, cache);
    }
}
