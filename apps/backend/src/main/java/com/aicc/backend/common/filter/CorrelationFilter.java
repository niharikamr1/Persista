package com.aicc.backend.common.filter;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.MDC;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.UUID;

@Component
@Order(1)
public class CorrelationFilter extends OncePerRequestFilter {

    static final String REQUEST_ID_HEADER = "X-Request-ID";
    static final String MDC_REQUEST_ID    = "requestId";
    static final String MDC_METHOD        = "method";
    static final String MDC_PATH          = "path";

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain chain) throws ServletException, IOException {
        String requestId = resolveRequestId(request);
        try {
            MDC.put(MDC_REQUEST_ID, requestId);
            MDC.put(MDC_METHOD, request.getMethod());
            MDC.put(MDC_PATH, request.getRequestURI());
            response.setHeader(REQUEST_ID_HEADER, requestId);
            chain.doFilter(request, response);
        } finally {
            MDC.remove(MDC_REQUEST_ID);
            MDC.remove(MDC_METHOD);
            MDC.remove(MDC_PATH);
        }
    }

    private String resolveRequestId(HttpServletRequest request) {
        String header = request.getHeader(REQUEST_ID_HEADER);
        return (header != null && !header.isBlank()) ? header : UUID.randomUUID().toString();
    }
}
