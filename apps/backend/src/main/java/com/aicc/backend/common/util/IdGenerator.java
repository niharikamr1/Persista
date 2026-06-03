package com.aicc.backend.common.util;

import java.util.UUID;

public final class IdGenerator {

    private IdGenerator() {}

    public static String generate() {
        return UUID.randomUUID().toString();
    }

    public static String prefixed(String prefix) {
        return prefix + "_" + UUID.randomUUID().toString().replace("-", "");
    }
}
