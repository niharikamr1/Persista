package com.aicc.backend.storage.infrastructure.web;

import com.aicc.backend.common.api.ApiResponse;
import com.aicc.backend.common.api.ApiVersion;
import com.aicc.backend.common.api.PageMeta;
import com.aicc.backend.common.security.CurrentUser;
import com.aicc.backend.storage.application.port.in.*;
import com.aicc.backend.storage.domain.FileRecord;
import com.aicc.backend.storage.infrastructure.web.dto.FileRecordResponse;
import com.aicc.backend.storage.infrastructure.web.dto.InitiateUploadRequest;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.util.List;

@RestController
@RequestMapping(ApiVersion.V1_FILES)
@RequiredArgsConstructor
public class FileController {

    private final InitiateUploadUseCase initiateUploadUseCase;
    private final UploadContentUseCase uploadContentUseCase;
    private final GetFileUseCase getFileUseCase;
    private final DeleteFileUseCase deleteFileUseCase;

    /**
     * POST /api/v1/files
     * Declare intent to upload; returns a file record in PENDING status.
     * Follow with PUT /api/v1/files/{id}/content to stream the bytes.
     */
    @PostMapping
    public ResponseEntity<ApiResponse<FileRecordResponse>> initiateUpload(
            @CurrentUser String userId,
            @Valid @RequestBody InitiateUploadRequest request) {
        FileRecord record = initiateUploadUseCase.initiate(
                userId,
                request.sessionId(),
                request.conversationId(),
                request.originalName(),
                request.mimeType(),
                request.sizeBytes());
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(FileRecordResponse.from(record)));
    }

    /**
     * PUT /api/v1/files/{id}/content
     * Stream raw bytes as the request body.
     * Optional ?checksum=<sha256-hex> for integrity verification.
     */
    @PutMapping("/{id}/content")
    public ResponseEntity<ApiResponse<FileRecordResponse>> uploadContent(
            @CurrentUser String userId,
            @PathVariable String id,
            @RequestParam(required = false) String checksum,
            HttpServletRequest httpRequest) throws IOException {
        FileRecord record = uploadContentUseCase.uploadContent(
                id, userId, httpRequest.getInputStream(), checksum);
        return ResponseEntity.ok(ApiResponse.ok(FileRecordResponse.from(record)));
    }

    /**
     * GET /api/v1/files/{id}
     * Returns file metadata; does not stream bytes.
     */
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<FileRecordResponse>> getFile(
            @CurrentUser String userId,
            @PathVariable String id) {
        FileRecord record = getFileUseCase.getRecord(id, userId);
        return ResponseEntity.ok(ApiResponse.ok(FileRecordResponse.from(record)));
    }

    /**
     * GET /api/v1/files/{id}/url
     * Returns a short-lived presigned URL for direct client download from MinIO.
     */
    @GetMapping("/{id}/url")
    public ResponseEntity<ApiResponse<String>> getSignedUrl(
            @CurrentUser String userId,
            @PathVariable String id) {
        String url = getFileUseCase.getSignedUrl(id, userId);
        return ResponseEntity.ok(ApiResponse.ok(url));
    }

    /**
     * DELETE /api/v1/files/{id}
     * Removes the object from MinIO and deletes the DB record.
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteFile(
            @CurrentUser String userId,
            @PathVariable String id) {
        deleteFileUseCase.delete(id, userId);
        return ResponseEntity.noContent().build();
    }

    /**
     * GET /api/v1/files
     * Paginated list of all files belonging to the authenticated user.
     */
    @GetMapping
    public ResponseEntity<ApiResponse<List<FileRecordResponse>>> listFiles(
            @CurrentUser String userId,
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC)
            Pageable pageable) {
        Page<FileRecord> page = getFileUseCase.listByUser(userId, pageable);
        List<FileRecordResponse> content = page.getContent().stream()
                .map(FileRecordResponse::from)
                .toList();
        return ResponseEntity.ok(ApiResponse.paged(content, PageMeta.from(page)));
    }
}
