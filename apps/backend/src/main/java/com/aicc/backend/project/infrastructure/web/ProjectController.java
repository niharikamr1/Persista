package com.aicc.backend.project.infrastructure.web;

import com.aicc.backend.common.api.ApiResponse;
import com.aicc.backend.common.api.ApiVersion;
import com.aicc.backend.common.api.PageMeta;
import com.aicc.backend.common.security.CurrentUser;
import com.aicc.backend.project.application.service.ProjectService;
import com.aicc.backend.project.domain.Project;
import com.aicc.backend.project.infrastructure.web.dto.CreateProjectRequest;
import com.aicc.backend.project.infrastructure.web.dto.ProjectResponse;
import com.aicc.backend.project.infrastructure.web.dto.UpdateProjectRequest;
import com.aicc.backend.session.application.service.SessionService;
import com.aicc.backend.session.domain.Session;
import com.aicc.backend.session.infrastructure.web.dto.SessionResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping(ApiVersion.V1_PROJECTS)
@RequiredArgsConstructor
public class ProjectController {

    private final ProjectService projectService;
    private final SessionService sessionService;

    @PostMapping
    public ResponseEntity<ApiResponse<ProjectResponse>> create(
            @CurrentUser String userId,
            @Valid @RequestBody CreateProjectRequest request) {
        Project project = projectService.create(userId, request.name(), request.description());
        return ResponseEntity.status(201).body(ApiResponse.ok(ProjectResponse.from(project)));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<ProjectResponse>>> list(
            @CurrentUser String userId,
            @RequestParam(defaultValue = "false") boolean includeArchived,
            @PageableDefault(size = 50, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        Page<Project> page = projectService.listByUser(userId, includeArchived, pageable);
        List<ProjectResponse> content = page.getContent().stream()
                .map(ProjectResponse::from)
                .toList();
        return ResponseEntity.ok(ApiResponse.paged(content, PageMeta.from(page)));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<ProjectResponse>> get(
            @CurrentUser String userId,
            @PathVariable String id) {
        return ResponseEntity.ok(ApiResponse.ok(
                ProjectResponse.from(projectService.getById(id, userId))));
    }

    @PatchMapping("/{id}")
    public ResponseEntity<ApiResponse<ProjectResponse>> update(
            @CurrentUser String userId,
            @PathVariable String id,
            @RequestBody UpdateProjectRequest request) {
        Project project = projectService.update(id, userId, request.name(), request.description());
        return ResponseEntity.ok(ApiResponse.ok(ProjectResponse.from(project)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(
            @CurrentUser String userId,
            @PathVariable String id) {
        projectService.delete(id, userId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{id}/sessions")
    public ResponseEntity<ApiResponse<List<SessionResponse>>> getSessions(
            @CurrentUser String userId,
            @PathVariable String id,
            @PageableDefault(size = 50, sort = "lastActiveAt", direction = Sort.Direction.DESC) Pageable pageable) {
        projectService.getById(id, userId); // ownership check
        Page<Session> page = sessionService.listByProject(id, userId, pageable);
        List<SessionResponse> content = page.getContent().stream()
                .map(SessionResponse::from)
                .toList();
        return ResponseEntity.ok(ApiResponse.paged(content, PageMeta.from(page)));
    }
}
