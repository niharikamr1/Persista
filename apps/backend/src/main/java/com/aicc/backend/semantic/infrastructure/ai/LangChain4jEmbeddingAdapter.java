package com.aicc.backend.semantic.infrastructure.ai;

import com.aicc.backend.semantic.application.port.out.EmbeddingPort;
import dev.langchain4j.model.embedding.EmbeddingModel;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class LangChain4jEmbeddingAdapter implements EmbeddingPort {

    private final EmbeddingModel embeddingModel;

    @Override
    public float[] embed(String text) {
        return embeddingModel.embed(text).content().vector();
    }
}
