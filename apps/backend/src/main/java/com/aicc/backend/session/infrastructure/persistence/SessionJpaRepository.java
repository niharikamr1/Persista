package com.aicc.backend.session.infrastructure.persistence;

import com.aicc.backend.session.application.port.out.SessionPort;
import com.aicc.backend.session.domain.Session;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface SessionJpaRepository extends JpaRepository<Session, String>, SessionPort {

    Optional<Session> findByIdAndUserId(String id, String userId);

    Page<Session> findByUserId(String userId, Pageable pageable);

    boolean existsByIdAndUserId(String id, String userId);

    Page<Session> findByProjectIdAndUserId(String projectId, String userId, Pageable pageable);

    Page<Session> findByUserIdAndTitleContainingIgnoreCase(String userId, String title, Pageable pageable);
}
