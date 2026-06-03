package com.aicc.backend.semantic.infrastructure.ai;

import com.aicc.backend.semantic.domain.MemoryType;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import dev.langchain4j.model.chat.ChatLanguageModel;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class SemanticExtractionAdapter {

    private static final String PROMPT_TEMPLATE = """
            Analyze the following AI conversation text and extract the most significant insight.
            Return ONLY a JSON object with these exact fields:
            - "type": one of [ARCHITECTURE_DECISION, BUG_REPORT, DEBUGGING_HISTORY, TODO, PROJECT_GOAL, REASONING_CHAIN, GENERAL]
            - "content": the key insight or decision (max 300 words)
            - "summary": a single sentence summary (max 50 words)

            Conversation text:
            %s

            Return only valid JSON, no markdown, no explanation.""";

    private final ChatLanguageModel chatLanguageModel;
    private final ObjectMapper objectMapper;

    public ExtractionResult extract(String text) {
        String prompt = PROMPT_TEMPLATE.formatted(truncate(text, 3000));
        try {
            String raw = chatLanguageModel.generate(prompt);
            String cleaned = stripMarkdownFences(raw.trim());
            JsonNode node = objectMapper.readTree(cleaned);

            MemoryType type = parseMemoryType(node.path("type").asText("GENERAL"));
            String content = node.path("content").asText(text);
            String summary = node.path("summary").asText("");
            return new ExtractionResult(type, content, summary);
        } catch (Exception e) {
            log.debug("Extraction fallback for chunk ({}): {}", text.length(), e.getMessage());
            return new ExtractionResult(MemoryType.GENERAL, text, "");
        }
    }

    private static MemoryType parseMemoryType(String raw) {
        try {
            return MemoryType.valueOf(raw.toUpperCase().replace("-", "_").replace(" ", "_"));
        } catch (IllegalArgumentException e) {
            return MemoryType.GENERAL;
        }
    }

    private static String stripMarkdownFences(String text) {
        if (text.startsWith("```")) {
            int firstNewline = text.indexOf('\n');
            int lastFence = text.lastIndexOf("```");
            if (firstNewline > 0 && lastFence > firstNewline) {
                return text.substring(firstNewline + 1, lastFence).strip();
            }
        }
        return text;
    }

    private static String truncate(String text, int maxLen) {
        return text.length() <= maxLen ? text : text.substring(0, maxLen);
    }

    public record ExtractionResult(MemoryType type, String content, String summary) {}
}
