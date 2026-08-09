package com.servis.backend.util;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

class SlugUtilsTest {

    @Test
    void slugify_BasicAndTurkish() {
        assertEquals("split-klima-pro", SlugUtils.slugify("Split Klima Pro"));
        assertEquals("iklimlendirme", SlugUtils.slugify("İklimlendirme"));
    }
}
