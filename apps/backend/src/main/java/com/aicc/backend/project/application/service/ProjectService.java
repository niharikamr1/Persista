package com.aicc.backend.project.application.service;

import com.aicc.backend.common.exception.ApiException;
import com.aicc.backend.common.util.IdGenerator;
import com.aicc.backend.project.application.port.in.CreateProjectUseCase;
import com.aicc.backend.project.application.port.in.GetProjectUseCase;
import com.aicc.backend.project.application.port.out.ProjectPort;
import com.aicc.backend.project.domain.Project;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class ProjectService implements CreateProjectUseCase, GetProjectUseCase {

    private final ProjectPort projectPort;

    @Override
    @Transactional
    public Project create(String userId, String name, String description) {
        Project project = Project.builder()
                .id(IdGenerator.prefixed("proj"))
                .userId(userId)
                .name(name.trim())
                .description(description != null && !description.isBlank() ? description.trim() : null)
                .build();
        return projectPort.save(project);
    }

    @Override
    @Transactional(readOnly = true)
    public Project getById(String projectId, String userId) {
        return projectPort.findByIdAndUserId(projectId, userId)
                .orElseThrow(() -> ApiException.notFound("Project not found"));
    }

    @Override
    @Transactional(readOnly = true)
    public Page<Project> listByUser(String userId, boolean includeArchived, Pageable pageable) {
        if (includeArchived) {
            return projectPort.findByUserId(userId, pageable);
        }
        return projectPort.findByUserIdAndArchived(userId, false, pageable);
    }

    @Transactional
    public Project update(String projectId, String userId, String name, String description) {
        Project project = getById(projectId, userId);
        if (name != null && !name.isBlank()) project.setName(name.trim());
        if (description != null) project.setDescription(description.isBlank() ? null : description.trim());
        return projectPort.save(project);
    }

    @Transactional
    public void delete(String projectId, String userId) {
        projectPort.findByIdAndUserId(projectId, userId)
                .orElseThrow(() -> ApiException.notFound("Project not found"));
        // sessions.project_id → ON DELETE SET NULL handles the FK automatically
        projectPort.deleteById(projectId);
    }
}
