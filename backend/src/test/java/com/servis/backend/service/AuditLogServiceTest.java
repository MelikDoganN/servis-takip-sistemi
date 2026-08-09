package com.servis.backend.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.servis.backend.audit.AuditActions;
import com.servis.backend.audit.AuditEvent;
import com.servis.backend.audit.AuditSources;
import com.servis.backend.entity.AuditLog;
import com.servis.backend.repository.AuditLogRepository;
import com.servis.backend.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.LinkedHashMap;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuditLogServiceTest {

    @Mock
    private AuditLogRepository auditLogRepository;

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private AuditLogService auditLogService;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(auditLogService, "objectMapper", new ObjectMapper());
        ReflectionTestUtils.setField(auditLogService, "self", auditLogService);
    }

    @Test
    void sanitize_RemovesPasswordJwtAndApiKeys() {
        Map<String, Object> input = new LinkedHashMap<>();
        input.put("email", "a@b.com");
        input.put("password", "secret123");
        input.put("jwt", "eyJhbGciOi...");
        input.put("apiKey", "meta-key");
        input.put("Authorization", "Bearer xxx");
        input.put("BOT_PASSWORD", "bot");
        input.put("access_token", "wa-token");
        input.put("serviceNumber", "SRV-2026-000021");

        Map<String, Object> clean = auditLogService.sanitizeForTest(input);

        assertEquals("a@b.com", clean.get("email"));
        assertEquals("SRV-2026-000021", clean.get("serviceNumber"));
        assertFalse(clean.containsKey("password"));
        assertFalse(clean.containsKey("jwt"));
        assertFalse(clean.containsKey("apiKey"));
        assertFalse(clean.containsKey("Authorization"));
        assertFalse(clean.containsKey("BOT_PASSWORD"));
        assertFalse(clean.containsKey("access_token"));
    }

    @Test
    void maskIp_MasksIpv4LastOctet() {
        assertEquals("192.168.1.*", AuditLogService.maskIp("192.168.1.55"));
        assertEquals("localhost", AuditLogService.maskIp("::1"));
        assertNull(AuditLogService.maskIp(null));
    }

    @Test
    void record_PersistsSanitizedMetadataOnly() {
        when(auditLogRepository.saveAndFlush(any(AuditLog.class))).thenAnswer(inv -> inv.getArgument(0));

        auditLogService.record(AuditEvent.of(AuditActions.LOGIN_SUCCESS)
                .description("Başarılı giriş yapıldı.")
                .source(AuditSources.WEB)
                .meta("email", "admin@test.com")
                .meta("password", "should-not-persist")
                .meta("token", "jwt-token"));

        ArgumentCaptor<AuditLog> captor = ArgumentCaptor.forClass(AuditLog.class);
        verify(auditLogRepository).saveAndFlush(captor.capture());
        String json = captor.getValue().getMetadataJson();
        assertNotNull(json);
        assertTrue(json.contains("admin@test.com"));
        assertFalse(json.contains("should-not-persist"));
        assertFalse(json.contains("jwt-token"));
        assertFalse(json.toLowerCase().contains("password"));
    }

    @Test
    void safeRecord_WhenRepositoryFails_DoesNotThrow() {
        when(auditLogRepository.saveAndFlush(any(AuditLog.class)))
                .thenThrow(new RuntimeException("db down"));

        assertDoesNotThrow(() ->
                auditLogService.safeRecord(AuditEvent.of(AuditActions.WORK_ORDER_CREATED)
                        .description("SRV-2026-000021 numaralı iş emri oluşturuldu.")
                        .source(AuditSources.WEB)));
    }
}
