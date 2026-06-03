package com.aicc.backend.common.security;

import com.aicc.backend.common.exception.ApiException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.Optional;

public final class SecurityUtils {

    private SecurityUtils() {}

    public static String getCurrentUserId() {
        return getCurrentUserIdOptional()
                .orElseThrow(() -> ApiException.unauthorized("No authenticated user in context"));
    }

    public static Optional<String> getCurrentUserIdOptional() {
        return Optional.ofNullable(SecurityContextHolder.getContext().getAuthentication())
                .filter(SecurityUtils::isRealUser)
                .map(Authentication::getName);
    }

    public static boolean hasRole(String role) {
        return Optional.ofNullable(SecurityContextHolder.getContext().getAuthentication())
                .filter(SecurityUtils::isRealUser)
                .map(auth -> auth.getAuthorities().stream()
                        .anyMatch(a -> a.getAuthority().equals("ROLE_" + role)))
                .orElse(false);
    }

    public static boolean isAdmin() {
        return hasRole("ADMIN");
    }

    private static boolean isRealUser(Authentication auth) {
        return auth.isAuthenticated() && !"anonymousUser".equals(auth.getPrincipal());
    }
}
