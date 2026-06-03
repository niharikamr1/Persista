package com.aicc.backend.common.api;

import org.springframework.data.domain.Page;

public record PageMeta(
        int number,
        int size,
        long totalElements,
        int totalPages,
        boolean hasNext,
        boolean hasPrev
) {
    public static PageMeta from(Page<?> page) {
        return new PageMeta(
                page.getNumber(),
                page.getSize(),
                page.getTotalElements(),
                page.getTotalPages(),
                page.hasNext(),
                page.hasPrevious()
        );
    }

    public static PageMeta of(int number, int size, long totalElements) {
        int totalPages = size == 0 ? 1 : (int) Math.ceil((double) totalElements / size);
        return new PageMeta(number, size, totalElements, totalPages,
                number < totalPages - 1, number > 0);
    }
}
