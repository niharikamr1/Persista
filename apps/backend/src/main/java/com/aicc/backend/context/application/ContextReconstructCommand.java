package com.aicc.backend.context.application;

/**
 * Application-layer command for context reconstruction.
 * Mapped from the web DTO; decouples the use-case contract from HTTP concerns.
 */
public record ContextReconstructCommand(
        String sessionId,
        String projectId,
        String conversationId,
        String platform,
        String query,
        int maxEvents,
        int maxMemories,
        int maxFiles,
        int tokenBudget,
        boolean cache
) {}
