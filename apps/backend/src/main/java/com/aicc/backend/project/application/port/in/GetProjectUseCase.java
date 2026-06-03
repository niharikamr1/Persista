package com.aicc.backend.project.application.port.in;

import com.aicc.backend.project.domain.Project;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface GetProjectUseCase {
    Project getById(String projectId, String userId);
    Page<Project> listByUser(String userId, boolean includeArchived, Pageable pageable);
}
