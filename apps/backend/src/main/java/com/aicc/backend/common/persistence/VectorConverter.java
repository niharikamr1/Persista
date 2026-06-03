package com.aicc.backend.common.persistence;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

/**
 * Converts float[] ↔ pgvector text format "[f1,f2,...,fn]".
 * pgvector accepts its own text protocol over JDBC, so we pass the
 * vector as a String which PostgreSQL casts to the vector type.
 */
@Converter
public class VectorConverter implements AttributeConverter<float[], String> {

    @Override
    public String convertToDatabaseColumn(float[] embedding) {
        if (embedding == null || embedding.length == 0) return null;
        StringBuilder sb = new StringBuilder("[");
        for (int i = 0; i < embedding.length; i++) {
            if (i > 0) sb.append(',');
            sb.append(embedding[i]);
        }
        sb.append(']');
        return sb.toString();
    }

    @Override
    public float[] convertToEntityAttribute(String dbData) {
        if (dbData == null || dbData.isBlank()) return null;
        String cleaned = dbData.trim().replaceAll("^\\[|]$", "");
        if (cleaned.isEmpty()) return new float[0];
        String[] parts = cleaned.split(",");
        float[] result = new float[parts.length];
        for (int i = 0; i < parts.length; i++) {
            result[i] = Float.parseFloat(parts[i].trim());
        }
        return result;
    }

    public static String toVectorString(float[] embedding) {
        if (embedding == null) return null;
        StringBuilder sb = new StringBuilder("[");
        for (int i = 0; i < embedding.length; i++) {
            if (i > 0) sb.append(',');
            sb.append(embedding[i]);
        }
        sb.append(']');
        return sb.toString();
    }
}
