package com.aicc.backend.auth.infrastructure.web;

import com.aicc.backend.auth.application.TokenPair;
import com.aicc.backend.auth.application.port.in.LoginUseCase;
import com.aicc.backend.auth.application.port.in.LogoutUseCase;
import com.aicc.backend.auth.application.port.in.RefreshTokenUseCase;
import com.aicc.backend.auth.application.port.in.RegisterUserUseCase;
import com.aicc.backend.auth.application.port.out.UserPort;
import com.aicc.backend.auth.infrastructure.web.dto.*;
import com.aicc.backend.common.api.ApiResponse;
import com.aicc.backend.common.api.ApiVersion;
import com.aicc.backend.common.config.AppProperties;
import com.aicc.backend.common.exception.ApiException;
import com.aicc.backend.common.security.CurrentUser;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping(ApiVersion.V1_AUTH)
@RequiredArgsConstructor
public class AuthController {

    private final RegisterUserUseCase registerUseCase;
    private final LoginUseCase loginUseCase;
    private final RefreshTokenUseCase refreshTokenUseCase;
    private final LogoutUseCase logoutUseCase;
    private final UserPort userPort;
    private final AppProperties properties;

    @PostMapping("/register")
    public ResponseEntity<ApiResponse<AuthResponse>> register(
            @Valid @RequestBody RegisterRequest req) {
        TokenPair tokens = registerUseCase.register(req.email(), req.password(), req.displayName());
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(AuthResponse.from(tokens, properties.jwt().accessExpiryMs())));
    }

    @PostMapping("/login")
    public ResponseEntity<ApiResponse<AuthResponse>> login(
            @Valid @RequestBody LoginRequest req) {
        TokenPair tokens = loginUseCase.login(req.email(), req.password());
        return ResponseEntity.ok(
                ApiResponse.ok(AuthResponse.from(tokens, properties.jwt().accessExpiryMs())));
    }

    @PostMapping("/refresh")
    public ResponseEntity<ApiResponse<AuthResponse>> refresh(
            @Valid @RequestBody RefreshRequest req) {
        TokenPair tokens = refreshTokenUseCase.refresh(req.refreshToken());
        return ResponseEntity.ok(
                ApiResponse.ok(AuthResponse.from(tokens, properties.jwt().accessExpiryMs())));
    }

    @PostMapping("/logout")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void logout(@CurrentUser String userId) {
        logoutUseCase.logout(userId);
    }

    @GetMapping("/me")
    public ResponseEntity<ApiResponse<UserResponse>> me(@CurrentUser String userId) {
        return userPort.findById(userId)
                .map(user -> ResponseEntity.ok(ApiResponse.ok(UserResponse.from(user))))
                .orElseThrow(() -> ApiException.notFound("User"));
    }
}
