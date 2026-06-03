package com.aicc.backend.session.application.port.in;

import com.aicc.backend.session.domain.Session;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface GetSessionUseCase {
    Session getById(String sessionId, String userId);
    Page<Session> listByUser(String userId, Pageable pageable);
}
