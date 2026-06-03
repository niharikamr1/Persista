package com.aicc.backend.auth.application.service;

import com.aicc.backend.auth.application.TokenPair;
import com.aicc.backend.auth.application.port.in.LoginUseCase;
import com.aicc.backend.auth.application.port.in.LogoutUseCase;
import com.aicc.backend.auth.application.port.in.RefreshTokenUseCase;
import com.aicc.backend.auth.application.port.in.RegisterUserUseCase;
import com.aicc.backend.auth.application.port.out.RefreshTokenPort;
import com.aicc.backend.auth.application.port.out.TokenGeneratorPort;
import com.aicc.backend.auth.application.port.out.UserPort;
import com.aicc.backend.auth.domain.RefreshToken;
import com.aicc.backend.auth.domain.User;
import com.aicc.backend.common.config.AppProperties;
import com.aicc.backend.common.exception.ApiException;
import com.aicc.backend.common.util.IdGenerator;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.util.Base64;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AuthService implements RegisterUserUseCase, LoginUseCase, RefreshTokenUseCase, LogoutUseCase {

    private final UserPort userPort;
    private final RefreshTokenPort refreshTokenPort;
    private final TokenGeneratorPort tokenGenerator;
    private final PasswordEncoder passwordEncoder;
    private final PasswordPolicyService passwordPolicy;
    private final AppProperties properties;

    @Override
    @Transactional
    public TokenPair register(String email, String password, String displayName) {
        passwordPolicy.validate(password);
        if (userPort.existsByEmail(email)) {
            throw ApiException.conflict("Email already registered");
        }
        User user = User.builder()
                .id(IdGenerator.prefixed("usr"))
                .email(email)
                .passwordHash(passwordEncoder.encode(password))
                .displayName(displayName)
                .build();
        userPort.save(user);
        return issueTokenPair(user);
    }

    @Override
    @Transactional
    public TokenPair login(String email, String password) {
        User user = userPort.findByEmail(email)
                .orElseThrow(() -> ApiException.unauthorized("Invalid credentials"));
        if (!passwordEncoder.matches(password, user.getPasswordHash())) {
            throw ApiException.unauthorized("Invalid credentials");
        }
        return issueTokenPair(user);
    }

    @Override
    @Transactional
    public TokenPair refresh(String rawRefreshToken) {
        String hash = hashToken(rawRefreshToken);
        RefreshToken token = refreshTokenPort.findByTokenHash(hash)
                .orElseThrow(() -> ApiException.unauthorized("Invalid refresh token"));

        if (token.isRevoked() || token.getExpiresAt().isBefore(Instant.now())) {
            throw ApiException.unauthorized("Refresh token expired or revoked");
        }
        token.setRevoked(true);
        refreshTokenPort.save(token);

        User user = userPort.findById(token.getUserId())
                .orElseThrow(() -> ApiException.unauthorized("User not found"));
        return issueTokenPair(user);
    }

    @Override
    @Transactional
    public void logout(String userId) {
        refreshTokenPort.revokeAllByUserId(userId);
    }

    private TokenPair issueTokenPair(User user) {
        String accessToken = tokenGenerator.generateAccessToken(
                user.getId(), user.getEmail(), user.getRole().name());

        String rawRefresh = UUID.randomUUID().toString();
        RefreshToken rt = RefreshToken.builder()
                .id(IdGenerator.prefixed("rt"))
                .userId(user.getId())
                .tokenHash(hashToken(rawRefresh))
                .expiresAt(Instant.now().plusMillis(properties.jwt().refreshExpiryMs()))
                .build();
        refreshTokenPort.save(rt);

        return new TokenPair(accessToken, rawRefresh);
    }

    private String hashToken(String token) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            return Base64.getEncoder().encodeToString(
                    md.digest(token.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 not available", e);
        }
    }
}
