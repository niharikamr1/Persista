package com.aicc.backend.auth.infrastructure.web.dto;

import jakarta.validation.constraints.NotBlank;

public record RefreshRequest(

        @NotBlank(message = "Refresh token is required")
        String refreshToken
) {}
