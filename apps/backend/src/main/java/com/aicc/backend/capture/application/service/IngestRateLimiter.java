package com.aicc.backend.capture.application.service;

import io.github.resilience4j.ratelimiter.RateLimiter;
import io.github.resilience4j.ratelimiter.RateLimiterRegistry;
import io.github.resilience4j.ratelimiter.RequestNotPermitted;
import org.springframework.stereotype.Component;

/**
 * Per-user rate guard for the event ingest endpoint.
 *
 * Each user gets an independent RateLimiter drawn from the "ingest" config
 * (200 events/minute, 0s timeout). The registry caches limiters by key so
 * repeated calls for the same user reuse the same sliding window state.
 */
@Component
public class IngestRateLimiter {

    private static final String CONFIG_NAME = "ingest";

    private final RateLimiterRegistry registry;

    public IngestRateLimiter(RateLimiterRegistry registry) {
        this.registry = registry;
    }

    /**
     * Acquires one permit for {@code userId}.
     *
     * @throws RequestNotPermitted if the per-user limit is exhausted
     */
    public void check(String userId) {
        RateLimiter limiter = registry.rateLimiter(CONFIG_NAME + "-" + userId, CONFIG_NAME);
        if (!limiter.acquirePermission()) {
            throw RequestNotPermitted.createRequestNotPermitted(limiter);
        }
    }
}
