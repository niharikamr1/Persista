package com.aicc.backend.common.security;

import com.aicc.backend.common.exception.ApiException;
import org.springframework.stereotype.Component;

@Component
public class OwnershipValidator {

    /**
     * Throws 403 if resourceUserId does not match the current authenticated user.
     * Use this before returning or mutating any user-scoped resource.
     */
    public void validate(String resourceUserId) {
        validate(resourceUserId, SecurityUtils.getCurrentUserId());
    }

    public void validate(String resourceUserId, String currentUserId) {
        if (!resourceUserId.equals(currentUserId)) {
            throw ApiException.forbidden("Access denied — resource belongs to another user");
        }
    }

    /**
     * Returns true if the resource belongs to the current user; false otherwise.
     * Use this for conditional logic rather than hard throws.
     */
    public boolean isOwner(String resourceUserId) {
        return SecurityUtils.getCurrentUserIdOptional()
                .map(id -> id.equals(resourceUserId))
                .orElse(false);
    }
}
