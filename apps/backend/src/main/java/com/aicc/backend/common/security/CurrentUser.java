package com.aicc.backend.common.security;

import java.lang.annotation.*;

/**
 * Inject the authenticated user's ID as a String method parameter.
 *
 * Usage:
 *   public ResponseEntity<?> myEndpoint(@CurrentUser String userId) { ... }
 *
 * Resolved by CurrentUserArgumentResolver. Throws 401 if no authenticated user.
 */
@Target(ElementType.PARAMETER)
@Retention(RetentionPolicy.RUNTIME)
@Documented
public @interface CurrentUser {}
