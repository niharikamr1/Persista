package com.aicc.backend.auth.application;

public record TokenPair(String accessToken, String refreshToken) {}
