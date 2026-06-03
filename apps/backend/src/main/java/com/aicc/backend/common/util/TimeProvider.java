package com.aicc.backend.common.util;

import org.springframework.stereotype.Component;

import java.time.Instant;

@Component
public class TimeProvider {

    public Instant now() {
        return Instant.now();
    }
}
