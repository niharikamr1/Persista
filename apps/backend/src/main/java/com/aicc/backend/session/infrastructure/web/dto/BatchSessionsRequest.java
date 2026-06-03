package com.aicc.backend.session.infrastructure.web.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;

import java.util.List;

public record BatchSessionsRequest(
        @NotEmpty @Size(max = 50, message = "Session batch size must not exceed 50")
        List<@Valid SessionWireDto> sessions
) {}
