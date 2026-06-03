package com.aicc.backend.auth.infrastructure.web.dto;

import com.aicc.backend.auth.domain.User;

import java.time.Instant;

public record UserResponse(
        String id,
        String email,
        String displayName,
        String role,
        Instant createdAt
) {
    public static UserResponse from(User user) {
        return new UserResponse(
                user.getId(),
                user.getEmail(),
                user.getDisplayName(),
                user.getRole().name(),
                user.getCreatedAt()
        );
    }
}
