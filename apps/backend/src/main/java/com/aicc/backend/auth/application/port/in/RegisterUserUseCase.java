package com.aicc.backend.auth.application.port.in;

import com.aicc.backend.auth.application.TokenPair;

public interface RegisterUserUseCase {
    TokenPair register(String email, String password, String displayName);
}
