plugins {
    java
    id("org.springframework.boot") version "3.4.1"
    id("io.spring.dependency-management") version "1.1.7"
}

group = "com.aicc"
version = "0.1.0-SNAPSHOT"

java {
    toolchain {
        languageVersion = JavaLanguageVersion.of(21)
    }
}

configurations {
    compileOnly {
        extendsFrom(configurations.annotationProcessor.get())
    }
}

repositories {
    mavenCentral()
}

extra["langchain4jVersion"] = "0.36.2"
extra["jjwtVersion"] = "0.12.6"
extra["minioVersion"] = "8.5.12"
extra["pgvectorVersion"] = "0.1.6"
extra["testcontainersVersion"] = "1.20.4"

dependencies {
    // ── Spring Boot starters ─────────────────────────────────────────────────
    implementation("org.springframework.boot:spring-boot-starter-web")
    implementation("org.springframework.boot:spring-boot-starter-data-jpa")
    implementation("org.springframework.boot:spring-boot-starter-security")
    implementation("org.springframework.boot:spring-boot-starter-validation")
    implementation("org.springframework.boot:spring-boot-starter-actuator")
    implementation("org.springframework.boot:spring-boot-starter-cache")

    // ── Database ─────────────────────────────────────────────────────────────
    runtimeOnly("org.postgresql:postgresql")
    implementation("org.flywaydb:flyway-core")
    implementation("org.flywaydb:flyway-database-postgresql")
    implementation("com.pgvector:pgvector:${property("pgvectorVersion")}")

    // ── JWT ───────────────────────────────────────────────────────────────────
    implementation("io.jsonwebtoken:jjwt-api:${property("jjwtVersion")}")
    runtimeOnly("io.jsonwebtoken:jjwt-impl:${property("jjwtVersion")}")
    runtimeOnly("io.jsonwebtoken:jjwt-jackson:${property("jjwtVersion")}")

    // ── Argon2 password hashing ───────────────────────────────────────────────
    implementation("org.bouncycastle:bcpkix-jdk18on:1.78.1")

    // ── File storage ──────────────────────────────────────────────────────────
    implementation("io.minio:minio:${property("minioVersion")}")

    // ── Semantic / AI layer ───────────────────────────────────────────────────
    implementation("dev.langchain4j:langchain4j:${property("langchain4jVersion")}")
    implementation("dev.langchain4j:langchain4j-open-ai:${property("langchain4jVersion")}")
    // Local embedding model — runs on-JVM, no API key or internet required
    implementation("dev.langchain4j:langchain4j-embeddings-all-minilm-l6-v2-q:${property("langchain4jVersion")}")

    // ── Cache ─────────────────────────────────────────────────────────────────
    implementation("com.github.ben-manes.caffeine:caffeine")

    // ── Serialisation ─────────────────────────────────────────────────────────
    implementation("com.fasterxml.jackson.datatype:jackson-datatype-jsr310")

    // ── Rate limiting ─────────────────────────────────────────────────────────
    implementation("io.github.resilience4j:resilience4j-spring-boot3:2.2.0")

    // ── Observability ─────────────────────────────────────────────────────────
    implementation("io.micrometer:micrometer-registry-prometheus")
    implementation("net.logstash.logback:logstash-logback-encoder:8.0")

    // ── Lombok ────────────────────────────────────────────────────────────────
    compileOnly("org.projectlombok:lombok")
    annotationProcessor("org.projectlombok:lombok")

    // ── Test ──────────────────────────────────────────────────────────────────
    testImplementation("org.springframework.boot:spring-boot-starter-test")
    testImplementation("org.springframework.security:spring-security-test")
    testImplementation("org.testcontainers:junit-jupiter:${property("testcontainersVersion")}")
    testImplementation("org.testcontainers:postgresql:${property("testcontainersVersion")}")
    testRuntimeOnly("com.h2database:h2")
    testCompileOnly("org.projectlombok:lombok")
    testAnnotationProcessor("org.projectlombok:lombok")
}

tasks.withType<Test> {
    useJUnitPlatform()
}

// Limit the bootRun JVM and inject datasource credentials as system properties.
// System properties override env-var resolution in Spring Boot, which is needed on Windows
// where the Gradle-forked JVM may not inherit the PowerShell session environment reliably.
tasks.named<org.springframework.boot.gradle.tasks.run.BootRun>("bootRun") {
    jvmArgs(
        "-Xms64m",
        "-Xmx256m",
        "-XX:MaxMetaspaceSize=192m",
        "-XX:+UseSerialGC"
    )

    // Read from Gradle's environment (inherited from start-backend.ps1) at config time.
    val dbHost = System.getenv("POSTGRES_HOST")     ?: "localhost"
    val dbPort = System.getenv("POSTGRES_PORT")     ?: "5433"
    val dbName = System.getenv("POSTGRES_DB")       ?: "aicc"
    val dbUser = System.getenv("POSTGRES_USER")     ?: "aicc_user"
    val dbPass = System.getenv("POSTGRES_PASSWORD") ?: "changeme"

    systemProperty("spring.datasource.url",      "jdbc:postgresql://$dbHost:$dbPort/$dbName")
    systemProperty("spring.datasource.username", dbUser)
    systemProperty("spring.datasource.password", dbPass)

    // Also forward optional AI key so the embedding bean doesn't fail validation
    val openAiKey = System.getenv("OPENAI_API_KEY") ?: "sk-placeholder"
    systemProperty("aicc.ai.open-ai-api-key", openAiKey)
}

// Enable virtual threads (Java 21) — makes blocking JPA + high-concurrency work well
tasks.withType<org.springframework.boot.gradle.tasks.bundling.BootJar> {
    archiveFileName.set("aicc-backend.jar")
}
