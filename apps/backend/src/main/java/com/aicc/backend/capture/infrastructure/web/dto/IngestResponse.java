package com.aicc.backend.capture.infrastructure.web.dto;

import com.aicc.backend.capture.application.BatchIngestResult;

import java.time.Instant;
import java.util.List;

public record IngestResponse(
        List<String> accepted,
        List<String> duplicates,
        List<String> rejected,
        String newCheckpoint,
        Instant serverTimestamp
) {
    public static IngestResponse from(BatchIngestResult result) {
        return new IngestResponse(
                result.accepted(),
                result.duplicates(),
                result.rejected(),
                result.newCheckpoint(),
                Instant.now()
        );
    }
}
