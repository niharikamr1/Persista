package com.aicc.backend.capture.application;

import com.aicc.backend.capture.domain.CaptureEvent;

import java.util.List;

/**
 * Published after a batch ingest transaction commits.
 * Consumed by SemanticProcessingService for async semantic extraction.
 */
public record EventsIngestedEvent(List<CaptureEvent> acceptedEvents) {}
