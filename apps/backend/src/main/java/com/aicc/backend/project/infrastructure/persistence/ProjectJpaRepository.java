package com.aicc.backend.project.infrastructure.persistence;

import com.aicc.backend.project.application.port.out.ProjectPort;
import com.aicc.backend.project.domain.Project;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface ProjectJpaRepository extends JpaRepository<Project, String>, ProjectPort {

    Optional<Project> findByIdAndUserId(String id, String userId);

    Page<Project> findByUserIdAndArchived(String userId, boolean archived, Pageable pageable);

    Page<Project> findByUserId(String userId, Pageable pageable);
}
