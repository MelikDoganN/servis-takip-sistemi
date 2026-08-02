package com.servis.backend.util;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

class PhoneNormalizerTest {

    @Test
    void normalizesTurkishFormatsToSameCanonical() {
        String expected = "905551112233";
        assertEquals(expected, PhoneNormalizer.normalize("+905551112233"));
        assertEquals(expected, PhoneNormalizer.normalize("905551112233"));
        assertEquals(expected, PhoneNormalizer.normalize("05551112233"));
        assertEquals(expected, PhoneNormalizer.normalize("5551112233"));
        assertEquals(expected, PhoneNormalizer.normalize("+90 555 111 22 33"));
        assertEquals(expected, PhoneNormalizer.normalize("0 (555) 111-22-33"));
        assertEquals(expected, PhoneNormalizer.normalize("90 555-111-2233"));
    }

    @Test
    void nullBlankAndTooShortReturnNull() {
        assertNull(PhoneNormalizer.normalize(null));
        assertNull(PhoneNormalizer.normalize(""));
        assertNull(PhoneNormalizer.normalize("   "));
        assertNull(PhoneNormalizer.normalize("12345"));
        assertNull(PhoneNormalizer.normalize("555"));
    }

    @Test
    void matchesIgnoresFormatDifferences() {
        assertTrue(PhoneNormalizer.matches("+90 555 111 22 33", "05551112233"));
        assertTrue(PhoneNormalizer.matches("5551112233", "905551112233"));
        assertFalse(PhoneNormalizer.matches("905551112233", "905559998877"));
        assertFalse(PhoneNormalizer.matches(null, "905551112233"));
    }

    @Test
    void searchVariantsIncludeCommonForms() {
        var variants = PhoneNormalizer.searchVariants("+90 (555) 111-22-33");
        assertTrue(variants.contains("905551112233"));
        assertTrue(variants.contains("05551112233"));
        assertTrue(variants.contains("5551112233"));
        assertTrue(variants.contains("+905551112233"));
    }
}
