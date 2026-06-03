package com.aicc.backend.common.exception;

import io.github.resilience4j.ratelimiter.RequestNotPermitted;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.ConstraintViolationException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.net.URI;
import java.time.Instant;
import java.util.List;
import java.util.Optional;

@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);
    private static final String ERROR_BASE_URI = "https://aicc.dev/errors/";

    // ── Rate limiting ─────────────────────────────────────────────────────────

    @ExceptionHandler(RequestNotPermitted.class)
    public ProblemDetail handleRateLimited(RequestNotPermitted ex, HttpServletResponse response) {
        log.debug("[{}] Rate limit exceeded: {}", requestId(), ex.getMessage());
        response.setHeader("Retry-After", "60");
        ProblemDetail pd = problem(HttpStatus.TOO_MANY_REQUESTS,
                "Rate limit exceeded. You may send at most 200 events per minute. Retry after 60 seconds.",
                ErrorCode.RATE_LIMITED.name());
        pd.setProperty("retryAfterSeconds", 60);
        return enrich(pd, null);
    }

    // ── Application exceptions ────────────────────────────────────────────────

    @ExceptionHandler(ApiException.class)
    public ProblemDetail handleApiException(ApiException ex) {
        if (ex.getStatus().is5xxServerError()) {
            log.error("[{}] ApiException: {}", requestId(), ex.getMessage(), ex);
        } else {
            log.debug("[{}] ApiException {}: {}", requestId(), ex.getCode(), ex.getMessage());
        }
        return enrich(problem(ex.getStatus(), ex.getMessage(), ex.getCode()), null);
    }

    // ── Validation ────────────────────────────────────────────────────────────

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ProblemDetail handleMethodArgumentNotValid(MethodArgumentNotValidException ex) {
        List<ValidationViolation> violations = ex.getBindingResult().getFieldErrors().stream()
                .map(fe -> ValidationViolation.of(fe.getField(), fe.getDefaultMessage(), fe.getRejectedValue()))
                .toList();

        // Also capture object-level constraints (cross-field)
        List<ValidationViolation> globalViolations = ex.getBindingResult().getGlobalErrors().stream()
                .map(oe -> ValidationViolation.of(oe.getObjectName(), oe.getDefaultMessage()))
                .toList();

        String detail = violations.isEmpty()
                ? "Validation failed"
                : violations.get(0).field() + ": " + violations.get(0).message();

        ProblemDetail pd = problem(HttpStatus.BAD_REQUEST, detail, ErrorCode.VALIDATION_ERROR.name());
        pd.setProperty("violations", concat(violations, globalViolations));
        return enrich(pd, null);
    }

    @ExceptionHandler(ConstraintViolationException.class)
    public ProblemDetail handleConstraintViolation(ConstraintViolationException ex) {
        List<ValidationViolation> violations = ex.getConstraintViolations().stream()
                .map(cv -> ValidationViolation.of(
                        cv.getPropertyPath().toString(),
                        cv.getMessage(),
                        cv.getInvalidValue()))
                .toList();
        ProblemDetail pd = problem(HttpStatus.BAD_REQUEST,
                "Constraint violation", ErrorCode.VALIDATION_ERROR.name());
        pd.setProperty("violations", violations);
        return enrich(pd, null);
    }

    // ── HTTP / protocol exceptions ────────────────────────────────────────────

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ProblemDetail handleNotReadable(HttpMessageNotReadableException ex) {
        return enrich(problem(HttpStatus.BAD_REQUEST,
                "Malformed or unreadable request body", ErrorCode.MALFORMED_REQUEST.name()), null);
    }

    @ExceptionHandler(HttpRequestMethodNotSupportedException.class)
    public ProblemDetail handleMethodNotSupported(HttpRequestMethodNotSupportedException ex) {
        return enrich(problem(HttpStatus.METHOD_NOT_ALLOWED,
                ex.getMessage(), ErrorCode.METHOD_NOT_ALLOWED.name()), null);
    }

    // ── Security exceptions ───────────────────────────────────────────────────

    @ExceptionHandler(AuthenticationException.class)
    public ProblemDetail handleAuthentication(AuthenticationException ex) {
        return enrich(problem(HttpStatus.UNAUTHORIZED,
                ex.getMessage(), ErrorCode.UNAUTHORIZED.name()), null);
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ProblemDetail handleAccessDenied(AccessDeniedException ex) {
        return enrich(problem(HttpStatus.FORBIDDEN,
                ex.getMessage(), ErrorCode.FORBIDDEN.name()), null);
    }

    // ── Database / infrastructure exceptions ──────────────────────────────────

    @ExceptionHandler(DataIntegrityViolationException.class)
    public ProblemDetail handleDataIntegrity(DataIntegrityViolationException ex) {
        log.warn("[{}] Data integrity violation: {}", requestId(), ex.getMostSpecificCause().getMessage());
        return enrich(problem(HttpStatus.CONFLICT,
                "Request conflicts with existing data", ErrorCode.CONFLICT.name()), null);
    }

    // ── Catch-all ─────────────────────────────────────────────────────────────

    @ExceptionHandler(Exception.class)
    public ProblemDetail handleUnexpected(Exception ex) {
        log.error("[{}] Unhandled exception: {}", requestId(), ex.getMessage(), ex);
        return enrich(problem(HttpStatus.INTERNAL_SERVER_ERROR,
                "An unexpected error occurred", ErrorCode.INTERNAL_ERROR.name()), null);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private ProblemDetail problem(HttpStatus status, String detail, String code) {
        ProblemDetail pd = ProblemDetail.forStatusAndDetail(status, detail);
        pd.setType(URI.create(ERROR_BASE_URI + code.toLowerCase().replace('_', '-')));
        pd.setProperty("code", code);
        return pd;
    }

    private ProblemDetail enrich(ProblemDetail pd, List<ValidationViolation> violations) {
        pd.setProperty("requestId", requestId());
        pd.setProperty("timestamp", Instant.now().toString());
        if (violations != null && !violations.isEmpty()) {
            pd.setProperty("violations", violations);
        }
        return pd;
    }

    private String requestId() {
        return Optional.ofNullable(MDC.get("requestId")).orElse("-");
    }

    private static <T> List<T> concat(List<T> a, List<T> b) {
        if (b.isEmpty()) return a;
        return java.util.stream.Stream.concat(a.stream(), b.stream()).toList();
    }
}
