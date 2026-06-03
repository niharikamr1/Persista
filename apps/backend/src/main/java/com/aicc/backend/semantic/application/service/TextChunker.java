package com.aicc.backend.semantic.application.service;

import java.util.ArrayList;
import java.util.List;

public final class TextChunker {

    private static final int CHUNK_SIZE = 2000;
    private static final int OVERLAP    = 200;

    private TextChunker() {}

    /**
     * Splits text into overlapping chunks of at most CHUNK_SIZE characters.
     * Overlap preserves context across chunk boundaries.
     */
    public static List<String> chunk(String text) {
        if (text == null || text.isBlank()) return List.of();
        String t = text.strip();
        if (t.length() <= CHUNK_SIZE) return List.of(t);

        List<String> chunks = new ArrayList<>();
        int start = 0;
        while (start < t.length()) {
            int end = Math.min(start + CHUNK_SIZE, t.length());
            // Try to break on a sentence boundary within the last 200 chars of the window
            if (end < t.length()) {
                int breakAt = lastSentenceEnd(t, Math.max(end - 200, start + 100), end);
                if (breakAt > start) end = breakAt;
            }
            chunks.add(t.substring(start, end).strip());
            start = end - OVERLAP;
            if (start <= 0) start = end; // guard against infinite loop for tiny overlap
        }
        return chunks;
    }

    /** Returns the index just after the last sentence-ending character in [from, to). */
    private static int lastSentenceEnd(String text, int from, int to) {
        for (int i = to - 1; i >= from; i--) {
            char c = text.charAt(i);
            if (c == '.' || c == '!' || c == '?') return i + 1;
        }
        return to; // no sentence boundary found — use hard cut
    }
}
