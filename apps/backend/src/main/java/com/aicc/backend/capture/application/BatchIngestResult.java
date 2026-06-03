package com.aicc.backend.capture.application;

import java.util.List;

/**
 * Result returned after a batch ingest operation.
 *
 * accepted   — IDs of events newly persisted this request
 * duplicates — IDs that already existed; treated as success for the client
 * rejected   — IDs that failed validation or caused a constraint violation
 * newCheckpoint — ID of the last accepted event; null if nothing was accepted
 */
public record BatchIngestResult(
        List<String> accepted,
        List<String> duplicates,
        List<String> rejected,
        String newCheckpoint
) {
    public static BatchIngestResult empty() {
        return new BatchIngestResult(List.of(), List.of(), List.of(), null);
    }

    public int totalProcessed() {
        return accepted.size() + duplicates.size();
    }
}
