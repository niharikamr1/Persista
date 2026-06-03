package com.aicc.backend.auth.infrastructure.persistence;

import com.aicc.backend.auth.application.port.out.UserPort;
import com.aicc.backend.auth.domain.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UserJpaRepository extends JpaRepository<User, String>, UserPort {

    Optional<User> findByEmail(String email);

    boolean existsByEmail(String email);
}
