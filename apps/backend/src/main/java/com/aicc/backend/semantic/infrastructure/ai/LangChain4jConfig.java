package com.aicc.backend.semantic.infrastructure.ai;

import com.aicc.backend.common.config.AppProperties;
import dev.langchain4j.model.chat.ChatLanguageModel;
import dev.langchain4j.model.embedding.EmbeddingModel;
import dev.langchain4j.model.embedding.onnx.allminilml6v2q.AllMiniLmL6V2QuantizedEmbeddingModel;
import dev.langchain4j.model.openai.OpenAiChatModel;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
@RequiredArgsConstructor
public class LangChain4jConfig {

    private final AppProperties appProperties;

    @Bean
    public EmbeddingModel embeddingModel() {
        // Runs entirely on the JVM — no API key or network required.
        // Produces 384-dimensional vectors (vs OpenAI's 1536).
        return new AllMiniLmL6V2QuantizedEmbeddingModel();
    }

    @Bean
    public ChatLanguageModel chatLanguageModel() {
        AppProperties.Ai ai = appProperties.ai();
        return OpenAiChatModel.builder()
                .apiKey(ai.openAiApiKey())
                .modelName(ai.chatModel())
                .temperature(0.0)
                .maxTokens(600)
                .build();
    }
}
