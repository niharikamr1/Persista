package com.aicc.backend;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;

@SpringBootTest
@ActiveProfiles("dev")
@TestPropertySource(properties = {
        "aicc.jwt.secret=test-secret-key-must-be-at-least-256-bits-long-padding",
        "aicc.minio.endpoint=http://localhost:9000",
        "aicc.minio.access-key=test",
        "aicc.minio.secret-key=test",
        "aicc.ai.open-ai-api-key=sk-test",
        "spring.flyway.enabled=false",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.datasource.url=jdbc:h2:mem:testdb;DB_CLOSE_DELAY=-1",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.jpa.database-platform=org.hibernate.dialect.H2Dialect"
})
class AiccApplicationTests {

    @Test
    void contextLoads() {
    }
}
