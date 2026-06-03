package com.aicc.backend.sync.infrastructure.web;

import com.aicc.backend.common.api.ApiResponse;
import com.aicc.backend.common.api.ApiVersion;
import com.aicc.backend.common.security.CurrentUser;
import com.aicc.backend.sync.application.port.in.RecordSyncUseCase;
import com.aicc.backend.sync.application.service.SyncService;
import com.aicc.backend.sync.domain.SyncCheckpoint;
import com.aicc.backend.sync.infrastructure.web.dto.SyncCheckpointResponse;
import com.aicc.backend.sync.infrastructure.web.dto.SyncStatusResponse;
import com.aicc.backend.sync.infrastructure.web.dto.UpdateCheckpointRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.List;

@RestController
@RequestMapping(ApiVersion.V1_SYNC)
@RequiredArgsConstructor
public class SyncController {

    private final SyncService syncService;
    private final RecordSyncUseCase recordSyncUseCase;

    /**
     * GET /api/v1/sync/status
     * Returns all per-platform checkpoints for the current user.
     * Used by the extension on startup to determine the last known sync position.
     */
    @GetMapping("/status")
    public ResponseEntity<ApiResponse<SyncStatusResponse>> getStatus(
            @CurrentUser String userId) {
        List<SyncCheckpointResponse> checkpoints = syncService.getCheckpoints(userId)
                .stream()
                .map(SyncCheckpointResponse::from)
                .toList();
        return ResponseEntity.ok(ApiResponse.ok(
                new SyncStatusResponse(checkpoints, Instant.now())));
    }

    /**
     * GET /api/v1/sync/checkpoint?platform=CHATGPT
     * Returns the checkpoint for a single platform.
     */
    @GetMapping("/checkpoint")
    public ResponseEntity<ApiResponse<SyncCheckpointResponse>> getCheckpoint(
            @CurrentUser String userId,
            @RequestParam String platform) {
        SyncCheckpoint cp = syncService.getCheckpoint(userId, platform.toUpperCase());
        if (cp == null) {
            return ResponseEntity.ok(ApiResponse.ok(
                    new SyncCheckpointResponse(platform.toUpperCase(), null, null)));
        }
        return ResponseEntity.ok(ApiResponse.ok(SyncCheckpointResponse.from(cp)));
    }

    /**
     * POST /api/v1/sync/checkpoint
     * Explicit checkpoint update — called by the extension after a successful sync.
     * (The ingest endpoint also advances the checkpoint automatically; this is for
     * cases where the extension needs to manually confirm a checkpoint.)
     */
    @PostMapping("/checkpoint")
    public ResponseEntity<ApiResponse<SyncCheckpointResponse>> updateCheckpoint(
            @CurrentUser String userId,
            @Valid @RequestBody UpdateCheckpointRequest request) {
        SyncCheckpoint cp = recordSyncUseCase.record(
                userId, request.platform(), request.lastSyncedEventId());
        return ResponseEntity.ok(ApiResponse.ok(SyncCheckpointResponse.from(cp)));
    }
}
