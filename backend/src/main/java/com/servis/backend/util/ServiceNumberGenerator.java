package com.servis.backend.util;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Locale;
import java.util.regex.Pattern;

/**
 * Servis numarası formatı: SRV-YYYY-XXXXXX (ör. SRV-2026-000017).
 */
public final class ServiceNumberGenerator {

    private static final Pattern SERVICE_NUMBER_PATTERN =
            Pattern.compile("^SRV-\\d{4}-\\d{6,}$", Pattern.CASE_INSENSITIVE);

    private ServiceNumberGenerator() {
    }

    public static String format(int year, long sequence) {
        if (sequence < 0) {
            throw new IllegalArgumentException("sequence must be non-negative");
        }
        return String.format(Locale.ROOT, "SRV-%d-%06d", year, sequence);
    }

    public static String formatForNow(long sequence) {
        return format(LocalDate.now().getYear(), sequence);
    }

    public static String formatForCreatedAt(LocalDateTime createdAt, long sequence) {
        int year = createdAt != null ? createdAt.getYear() : LocalDate.now().getYear();
        return format(year, sequence);
    }

    public static String normalize(String raw) {
        if (raw == null) {
            return null;
        }
        String cleaned = raw.trim().replaceAll("[\\[\\]]", "").toUpperCase(Locale.ROOT);
        return cleaned.isEmpty() ? null : cleaned;
    }

    public static boolean looksLikeServiceNumber(String raw) {
        String normalized = normalize(raw);
        return normalized != null && SERVICE_NUMBER_PATTERN.matcher(normalized).matches();
    }
}
