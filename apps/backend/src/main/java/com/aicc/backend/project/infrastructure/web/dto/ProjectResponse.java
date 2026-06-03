package com.aicc.backend.project.infrastructure.web.dto;

import com.aicc.backend.project.domain.Project;

import java.time.Instant;

public record ProjectResponse(
        String id,
        String name,
        String description,
        boolean archived,
        Instant createdAt,
        Instant updatedAt
) {
    public static ProjectResponse from(Project p) {
        return new ProjectResponse(
                p.getId(),
                p.getName(),
                p.getDescription(),
                p.isArchived(),
                p.getCreatedAt(),
                p.getUpdatedAt()
        );
    }
}
