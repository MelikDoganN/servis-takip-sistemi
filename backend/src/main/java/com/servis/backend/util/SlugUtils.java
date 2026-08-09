package com.servis.backend.util;

import java.text.Normalizer;
import java.util.Locale;
import java.util.regex.Pattern;

public final class SlugUtils {

    private static final Pattern NON_LATIN = Pattern.compile("[^\\w-]+");
    private static final Pattern WHITESPACE = Pattern.compile("[\\s_]+");

    private SlugUtils() {
    }

    public static String slugify(String input) {
        if (input == null || input.isBlank()) {
            return "";
        }
        String normalized = Normalizer.normalize(input.trim(), Normalizer.Form.NFD)
                .replaceAll("\\p{M}+", "");
        // Turkish chars after NFD may remain for ı — map common TR
        normalized = normalized
                .replace('ı', 'i')
                .replace('İ', 'i')
                .replace('ş', 's')
                .replace('Ş', 's')
                .replace('ğ', 'g')
                .replace('Ğ', 'g')
                .replace('ü', 'u')
                .replace('Ü', 'u')
                .replace('ö', 'o')
                .replace('Ö', 'o')
                .replace('ç', 'c')
                .replace('Ç', 'c');
        String lower = normalized.toLowerCase(Locale.ROOT);
        lower = WHITESPACE.matcher(lower).replaceAll("-");
        lower = NON_LATIN.matcher(lower).replaceAll("-");
        lower = lower.replaceAll("-{2,}", "-");
        return lower.replaceAll("^-+|-+$", "");
    }
}
