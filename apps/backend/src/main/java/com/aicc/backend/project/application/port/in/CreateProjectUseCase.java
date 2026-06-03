package com.aicc.backend.project.application.port.in;

import com.aicc.backend.project.domain.Project;

public interface CreateProjectUseCase {
    Project create(String userId, String name, String description);
}
