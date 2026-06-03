package com.aicc.backend.auth.application.port.in;

import com.aicc.backend.auth.application.TokenPair;

public interface LoginUseCase {
    TokenPair login(String email, String password);
}
