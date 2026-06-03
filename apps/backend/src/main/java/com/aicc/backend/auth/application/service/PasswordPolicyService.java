package com.aicc.backend.auth.application.service;

import com.aicc.backend.common.exception.ApiException;
import org.springframework.stereotype.Service;

@Service
public class PasswordPolicyService {

    private static final int MIN_LENGTH = 8;
    private static final int MAX_LENGTH = 128;

    public void validate(String password) {
        if (password == null || password.length() < MIN_LENGTH) {
            throw ApiException.badRequest(
                    "Password must be at least " + MIN_LENGTH + " characters");
        }
        if (password.length() > MAX_LENGTH) {
            throw ApiException.badRequest(
                    "Password must not exceed " + MAX_LENGTH + " characters");
        }
        if (!containsUppercase(password)) {
            throw ApiException.badRequest(
                    "Password must contain at least one uppercase letter");
        }
        if (!containsDigitOrSpecial(password)) {
            throw ApiException.badRequest(
                    "Password must contain at least one digit or special character");
        }
    }

    private boolean containsUppercase(String password) {
        return password.chars().anyMatch(Character::isUpperCase);
    }

    private boolean containsDigitOrSpecial(String password) {
        return password.chars().anyMatch(
                ch -> Character.isDigit(ch) || !Character.isLetterOrDigit(ch));
    }
}
