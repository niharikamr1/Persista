package com.aicc.backend.session.application.port.in;

import com.aicc.backend.capture.domain.AIPlatform;
import com.aicc.backend.session.domain.Session;

public interface CreateSessionUseCase {
    Session create(String userId, AIPlatform platform, String title,
                   String conversationId, String projectId);
}
