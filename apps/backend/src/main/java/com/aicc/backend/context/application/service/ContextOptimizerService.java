package com.aicc.backend.context.application.service;

import com.aicc.backend.context.domain.ContextSegment;
import com.aicc.backend.context.domain.ContextSegmentType;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

/**
 * Ranks, deduplicates, and trims a candidate segment list to fit within a token budget.
 *
 * Scoring weights by type:
 *   SESSION  → base 0.90
 *   MEMORY   → base 0.75  (boosted by the segment's own relevanceScore from vector search)
 *   EVENT    → base 0.60  (boosted by recency encoded in relevanceScore)
 *   FILE     → base 0.45
 *
 * Deduplication: drops a segment whose content shares more than 80 % of tokens
 * with a higher-scored segment already accepted.
 */
@Service
public class ContextOptimizerService {

    private static final int CHARS_PER_TOKEN = 4;

    public int estimateTokens(String text) {
        if (text == null || text.isBlank()) return 0;
        return Math.max(1, text.length() / CHARS_PER_TOKEN);
    }

    public List<ContextSegment> optimize(List<ContextSegment> candidates, int tokenBudget) {
        if (candidates.isEmpty()) return List.of();

        // Score and sort descending
        List<ContextSegment> sorted = candidates.stream()
                .sorted(Comparator.comparingDouble(this::effectiveScore).reversed())
                .toList();

        List<ContextSegment> accepted = new ArrayList<>();
        int usedTokens = 0;

        for (ContextSegment candidate : sorted) {
            if (candidate.tokenCount() <= 0) continue;
            if (usedTokens + candidate.tokenCount() > tokenBudget) continue;
            if (isDuplicate(candidate, accepted)) continue;
            accepted.add(candidate);
            usedTokens += candidate.tokenCount();
        }

        return accepted;
    }

    private double effectiveScore(ContextSegment seg) {
        double base = switch (seg.segmentType()) {
            case SESSION -> 0.90;
            case MEMORY  -> 0.75;
            case EVENT   -> 0.60;
            case FILE    -> 0.45;
        };
        // Blend base with the segment's own relevanceScore (e.g. from vector search)
        return 0.5 * base + 0.5 * seg.relevanceScore();
    }

    /**
     * Returns true if more than 80 % of the candidate's words already appear
     * in the content of any accepted segment. Simple word-overlap deduplication.
     */
    private boolean isDuplicate(ContextSegment candidate, List<ContextSegment> accepted) {
        if (accepted.isEmpty()) return false;
        String candidateContent = candidate.content().toLowerCase();
        String[] candidateWords = candidateContent.split("\\s+");
        if (candidateWords.length == 0) return false;

        for (ContextSegment a : accepted) {
            String acceptedContent = a.content().toLowerCase();
            long overlap = 0;
            for (String word : candidateWords) {
                if (word.length() > 3 && acceptedContent.contains(word)) overlap++;
            }
            if ((double) overlap / candidateWords.length > 0.80) return true;
        }
        return false;
    }
}
