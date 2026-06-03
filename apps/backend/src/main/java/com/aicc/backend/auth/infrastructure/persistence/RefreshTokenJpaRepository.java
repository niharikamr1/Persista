package com.aicc.backend.auth.infrastructure.persistence;

import com.aicc.backend.auth.application.port.out.RefreshTokenPort;
import com.aicc.backend.auth.domain.RefreshToken;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface RefreshTokenJpaRepository extends JpaRepository<RefreshToken, String>, RefreshTokenPort {

    Optional<RefreshToken> findByTokenHash(String tokenHash);

    @Modifying
    @Query("UPDATE RefreshToken t SET t.revoked = true WHERE t.userId = :userId")
    @Override
    void revokeAllByUserId(String userId);
}
