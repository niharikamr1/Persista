package com.aicc.backend.context.application.port.in;

import com.aicc.backend.context.application.ContextReconstructCommand;
import com.aicc.backend.context.domain.ReconstructedContext;

public interface ReconstructContextUseCase {
    ReconstructedContext reconstruct(String userId, ContextReconstructCommand command);
}
