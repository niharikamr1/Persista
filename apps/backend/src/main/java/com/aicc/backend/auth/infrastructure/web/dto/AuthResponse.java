package com.aicc.backend.auth.infrastructure.web.dto;

import com.aicc.backend.auth.application.TokenPair;

public record AuthResponse(
        String accessToken,
        String refreshToken,
        String tokenType,
        long expiresIn   // seconds until access token expires
) {
    public static AuthResponse from(TokenPair pair, long accessExpiryMs) {
        return new AuthResponse(
                pair.accessToken(),
                pair.refreshToken(),
                "Bearer",
                accessExpiryMs / 1000
        );
    }
}
