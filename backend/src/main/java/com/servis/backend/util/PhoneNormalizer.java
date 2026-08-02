package com.servis.backend.util;

import java.util.LinkedHashSet;
import java.util.Set;

/**
 * Türkiye WhatsApp/telefon numarası normalizasyonu.
 * Canonical format: {@code 90} + 10 haneli ulusal numara (ör. {@code 905551112233}), artı işareti yok.
 */
public final class PhoneNormalizer {

    private static final int CANONICAL_LENGTH = 12;

    private PhoneNormalizer() {
    }

    /**
     * Ham numarayı canonical forma çevirir. Null/blank veya geçersizse null döner.
     */
    public static String normalize(String raw) {
        if (raw == null || raw.isBlank()) {
            return null;
        }
        String digits = stripSeparators(raw).replace("+", "");
        digits = digits.replaceAll("\\D", "");
        if (digits.isEmpty()) {
            return null;
        }

        String national;
        if (digits.startsWith("90") && digits.length() >= 12) {
            national = digits.substring(2);
        } else if (digits.startsWith("0") && digits.length() >= 11) {
            national = digits.substring(1);
        } else {
            national = digits;
        }

        if (national.length() > 10) {
            national = national.substring(national.length() - 10);
        }
        if (national.length() != 10) {
            return null;
        }
        return "90" + national;
    }

    /**
     * DB'de saklanmış olabilecek ham format varyantları (normalize + sık görülen yazımlar).
     * Mevcut kayıtları bozmadan arama için kullanılır.
     */
    public static Set<String> searchVariants(String raw) {
        Set<String> variants = new LinkedHashSet<>();
        if (raw != null && !raw.isBlank()) {
            String trimmed = raw.trim();
            variants.add(trimmed);
            String stripped = stripSeparators(trimmed);
            variants.add(stripped);
            if (stripped.startsWith("+")) {
                variants.add(stripped.substring(1));
            }
        }

        String canonical = normalize(raw);
        if (canonical != null) {
            String national = canonical.substring(2);
            variants.add(canonical);
            variants.add("+" + canonical);
            variants.add("+90" + national);
            variants.add("90" + national);
            variants.add("0" + national);
            variants.add(national);
        }
        return variants;
    }

    /**
     * İki numaranın aynı kişiye ait olup olmadığını canonical karşılaştırmayla kontrol eder.
     */
    public static boolean matches(String a, String b) {
        String na = normalize(a);
        String nb = normalize(b);
        if (na != null && nb != null) {
            return na.equals(nb);
        }
        if (a == null || b == null) {
            return false;
        }
        String sa = stripSeparators(a.trim());
        String sb = stripSeparators(b.trim());
        if (sa.startsWith("+")) {
            sa = sa.substring(1);
        }
        if (sb.startsWith("+")) {
            sb = sb.substring(1);
        }
        return !sa.isEmpty() && sa.equals(sb);
    }

    public static boolean isValidCanonical(String value) {
        String n = normalize(value);
        return n != null && n.length() == CANONICAL_LENGTH && n.startsWith("90");
    }

    private static String stripSeparators(String value) {
        return value.replace(" ", "")
                .replace("-", "")
                .replace("(", "")
                .replace(")", "")
                .replace(".", "");
    }
}
