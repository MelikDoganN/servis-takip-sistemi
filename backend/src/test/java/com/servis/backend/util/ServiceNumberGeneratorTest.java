package com.servis.backend.util;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class ServiceNumberGeneratorTest {

    @Test
    void format_padsToSixDigits() {
        assertEquals("SRV-2026-000017", ServiceNumberGenerator.format(2026, 17));
        assertEquals("SRV-2026-123456", ServiceNumberGenerator.format(2026, 123456));
    }

    @Test
    void normalize_stripsBracketsAndCase() {
        assertEquals("SRV-2026-000017", ServiceNumberGenerator.normalize(" [srv-2026-000017] "));
        assertNull(ServiceNumberGenerator.normalize("   "));
    }

    @Test
    void looksLikeServiceNumber() {
        assertTrue(ServiceNumberGenerator.looksLikeServiceNumber("SRV-2026-000017"));
        assertTrue(ServiceNumberGenerator.looksLikeServiceNumber("srv-2026-000017"));
        assertFalse(ServiceNumberGenerator.looksLikeServiceNumber("17"));
        assertFalse(ServiceNumberGenerator.looksLikeServiceNumber("WO-17"));
    }
}
