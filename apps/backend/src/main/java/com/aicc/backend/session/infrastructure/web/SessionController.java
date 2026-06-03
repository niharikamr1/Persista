package com.aicc.backend.session.infrastructure.web;

import com.aicc.backend.capture.application.port.in.QueryEventsUseCase;
import com.aicc.backend.capture.domain.CaptureEvent;
import com.aicc.backend.capture.infrastructure.web.dto.CaptureEventResponse;
import com.aicc.backend.common.api.ApiResponse;
import com.aicc.backend.common.api.ApiVersion;
import com.aicc.backend.common.api.PageMeta;
import com.aicc.backend.common.security.CurrentUser;
import com.aicc.backend.session.application.service.SessionService;
import com.aicc.backend.session.domain.Session;
import com.aicc.backend.session.infrastructure.web.dto.BatchSessionsRequest;
import com.aicc.backend.session.infrastructure.web.dto.BatchSessionsResponse;
import com.aicc.backend.session.infrastructure.web.dto.SessionResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping(ApiVersion.V1_SESSIONS)
@RequiredArgsConstructor
public class SessionController {

    private final SessionService sessionService;
    private final QueryEventsUseCase queryEventsUseCase;

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<SessionResponse>> getSession(
            @CurrentUser String userId,
            @PathVariable String id) {
        Session session = sessionService.getById(id, userId);
        return ResponseEntity.ok(ApiResponse.ok(SessionResponse.from(session)));
    }

    @GetMapping("/{id}/events")
    public ResponseEntity<ApiResponse<List<CaptureEventResponse>>> getSessionEvents(
            @CurrentUser String userId,
            @PathVariable String id) {
        // Ownership check — throws 404 if session doesn't belong to this user
        sessionService.getById(id, userId);
        List<CaptureEvent> events = queryEventsUseCase.getSessionEvents(id);
        List<CaptureEventResponse> response = events.stream()
                .map(CaptureEventResponse::from)
                .toList();
        return ResponseEntity.ok(ApiResponse.ok(response));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<SessionResponse>>> listSessions(
            @CurrentUser String userId,
            @RequestParam(required = false) String q,
            @PageableDefault(size = 20, sort = "startedAt", direction = Sort.Direction.DESC) Pageable pageable) {
        Page<Session> page = (q != null && !q.isBlank())
                ? sessionService.searchByUser(userId, q, pageable)
                : sessionService.listByUser(userId, pageable);

        List<String> sessionIds = page.getContent().stream().map(Session::getId).toList();
        java.util.Map<String, Long> eventCounts = queryEventsUseCase.countSessionEventsByIds(sessionIds);

        List<SessionResponse> content = page.getContent().stream()
                .map(s -> SessionResponse.from(s, eventCounts.getOrDefault(s.getId(), 0L).intValue()))
                .toList();
        return ResponseEntity.ok(ApiResponse.paged(content, PageMeta.from(page)));
    }

    @PatchMapping("/{id}/title")
    public ResponseEntity<ApiResponse<SessionResponse>> renameSession(
            @CurrentUser String userId,
            @PathVariable String id,
            @RequestBody java.util.Map<String, String> body) {
        String newTitle = body.getOrDefault("title", "").trim();
        Session session = sessionService.rename(id, userId, newTitle);
        return ResponseEntity.ok(ApiResponse.ok(SessionResponse.from(session)));
    }

    @PatchMapping("/{id}/project")
    public ResponseEntity<ApiResponse<SessionResponse>> assignProject(
            @CurrentUser String userId,
            @PathVariable String id,
            @RequestBody java.util.Map<String, String> body) {
        // null JSON value = unassign from any project
        String projectId = body.get("projectId");
        Session session = sessionService.assignToProject(id, userId, projectId);
        return ResponseEntity.ok(ApiResponse.ok(SessionResponse.from(session)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteSession(
            @CurrentUser String userId,
            @PathVariable String id) {
        sessionService.delete(id, userId);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/batch")
    public ResponseEntity<ApiResponse<BatchSessionsResponse>> batchSync(
            @CurrentUser String userId,
            @Valid @RequestBody BatchSessionsRequest request) {
        int count = sessionService.batchUpsert(request.sessions(), userId);
        return ResponseEntity.ok(ApiResponse.ok(new BatchSessionsResponse(count)));
    }
}
