package com.aicc.backend.auth.application.port.in;

import com.aicc.backend.auth.application.TokenPair;

public interface RefreshTokenUseCase {
    TokenPair refresh(String rawRefreshToken);
}
