package com.aicc.backend.common.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.task.AsyncTaskExecutor;
import org.springframework.core.task.support.TaskExecutorAdapter;

import java.util.concurrent.Executors;

@Configuration
public class AsyncConfig {

    /**
     * Use Java 21 virtual threads for all async tasks and Spring MVC request handling.
     * This makes blocking JPA calls cheap without needing reactive/WebFlux.
     */
    @Bean
    public AsyncTaskExecutor applicationTaskExecutor() {
        return new TaskExecutorAdapter(Executors.newVirtualThreadPerTaskExecutor());
    }
}
