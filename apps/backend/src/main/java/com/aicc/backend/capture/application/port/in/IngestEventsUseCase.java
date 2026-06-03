package com.aicc.backend.capture.application.port.in;

import com.aicc.backend.capture.application.BatchIngestResult;
import com.aicc.backend.capture.domain.CaptureEvent;

import java.util.List;

public interface IngestEventsUseCase {
    CaptureEvent ingest(CaptureEvent event);
    BatchIngestResult ingestBatch(List<CaptureEvent> events);
}
