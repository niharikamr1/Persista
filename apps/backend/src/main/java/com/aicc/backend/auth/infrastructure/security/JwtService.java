package com.aicc.backend.auth.infrastructure.security;

import com.aicc.backend.auth.application.port.out.TokenGeneratorPort;
import com.aicc.backend.common.config.AppProperties;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class JwtService implements TokenGeneratorPort {

    private final AppProperties properties;

    @Override
    public String generateAccessToken(String userId, String email, String role) {
        return Jwts.builder()
                .subject(userId)
                .claims(Map.of("email", email, "role", role))
                .issuedAt(new Date())
                .expiration(new Date(System.currentTimeMillis() + properties.jwt().accessExpiryMs()))
                .signWith(signingKey())
                .compact();
    }

    public Claims validateAndParse(String token) {
        try {
            return Jwts.parser()
                    .verifyWith(signingKey())
                    .build()
                    .parseSignedClaims(token)
                    .getPayload();
        } catch (JwtException ex) {
            throw new JwtException("Invalid or expired token", ex);
        }
    }

    private SecretKey signingKey() {
        return Keys.hmacShaKeyFor(properties.jwt().secret().getBytes(StandardCharsets.UTF_8));
    }
}
