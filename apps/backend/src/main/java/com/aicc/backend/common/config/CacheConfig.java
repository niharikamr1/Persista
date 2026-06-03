package com.aicc.backend.common.config;

import com.github.benmanes.caffeine.cache.Caffeine;
import org.springframework.cache.CacheManager;
import org.springframework.cache.caffeine.CaffeineCacheManager;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.time.Duration;

@Configuration
public class CacheConfig {

    public static final String CONTEXT_CACHE = "reconstructed-contexts";
    public static final String SEMANTIC_CACHE = "semantic-results";
    public static final String SESSION_CACHE = "hot-sessions";

    @Bean
    public CacheManager cacheManager() {
        CaffeineCacheManager manager = new CaffeineCacheManager(
                CONTEXT_CACHE, SEMANTIC_CACHE, SESSION_CACHE
        );
        manager.setCaffeine(Caffeine.newBuilder()
                .maximumSize(500)
                .expireAfterWrite(Duration.ofMinutes(10))
                .recordStats());
        return manager;
    }
}
