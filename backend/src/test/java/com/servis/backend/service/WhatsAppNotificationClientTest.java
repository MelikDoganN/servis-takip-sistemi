package com.servis.backend.service;

import com.servis.backend.dto.WhatsAppNotificationRequest;
import com.servis.backend.entity.WhatsAppOutbox;
import com.servis.backend.repository.NotificationDedupRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpEntity;
import org.springframework.http.ResponseEntity;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestTemplate;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class WhatsAppNotificationClientTest {

    @Mock
    private RestTemplate restTemplate;

    @Mock
    private NotificationDedupRepository notificationDedupRepository;

    @Mock
    private BotInteractionLogService botInteractionLogService;

    @Mock
    private WhatsAppOutboxService whatsAppOutboxService;

    @Mock
    private WorkOrderNotificationTracker workOrderNotificationTracker;

    @Mock
    private AuditLogService auditLogService;

    @InjectMocks
    private WhatsAppNotificationClient client;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(client, "botBaseUrl", "");
        ReflectionTestUtils.setField(client, "botApiKey", "");
    }

    @Test
    void sendNotification_MissingUrl_SkipsCall() {
        ReflectionTestUtils.setField(client, "botApiKey", "secret-key");
        client.sendNotification("905551112233", "Merhaba");
        verify(restTemplate, never()).postForEntity(anyString(), any(), eq(String.class));
    }

    @Test
    void sendNotification_MissingApiKey_SkipsCall() {
        ReflectionTestUtils.setField(client, "botBaseUrl", "https://bot.example.com");
        client.sendNotification("905551112233", "Merhaba");
        verify(restTemplate, never()).postForEntity(anyString(), any(), eq(String.class));
    }

    @Test
    void sendNotification_WithUrlAndKey_SendsHeaderAndEventType() {
        ReflectionTestUtils.setField(client, "botBaseUrl", "https://bot.example.com/");
        ReflectionTestUtils.setField(client, "botApiKey", "secret-key");
        when(restTemplate.postForEntity(anyString(), any(), eq(String.class)))
                .thenReturn(ResponseEntity.ok("ok"));
        when(notificationDedupRepository.existsByWorkOrderIdAndEventTypeAndEventKey(any(), any(), any()))
                .thenReturn(false);
        when(notificationDedupRepository.saveAndFlush(any())).thenAnswer(inv -> inv.getArgument(0));

        WhatsAppNotificationRequest req = new WhatsAppNotificationRequest();
        req.setPhone("0555 111 22 33");
        req.setMessage("Merhaba");
        req.setEventType(WhatsAppNotificationRequest.EVENT_WORK_ORDER_CREATED);
        req.setWorkOrderId(10L);
        req.setTargetStatus("OPEN");
        client.sendNotification(req);

        ArgumentCaptor<String> urlCaptor = ArgumentCaptor.forClass(String.class);
        @SuppressWarnings("unchecked")
        ArgumentCaptor<HttpEntity<Map<String, Object>>> entityCaptor = ArgumentCaptor.forClass(HttpEntity.class);
        verify(restTemplate).postForEntity(urlCaptor.capture(), entityCaptor.capture(), eq(String.class));

        assertEquals("https://bot.example.com/send-notification", urlCaptor.getValue());
        assertEquals("secret-key", entityCaptor.getValue().getHeaders().getFirst("X-Bot-Api-Key"));
        assertEquals("905551112233", entityCaptor.getValue().getBody().get("phone"));
        assertEquals("WORK_ORDER_CREATED", entityCaptor.getValue().getBody().get("eventType"));
    }

    @Test
    void sendNotification_DuplicateEvent_SkipsHttp() {
        ReflectionTestUtils.setField(client, "botBaseUrl", "https://bot.example.com");
        ReflectionTestUtils.setField(client, "botApiKey", "secret-key");
        when(notificationDedupRepository.existsByWorkOrderIdAndEventTypeAndEventKey(10L, "STATUS_CHANGED", "CLOSED"))
                .thenReturn(true);

        WhatsAppNotificationRequest req = new WhatsAppNotificationRequest();
        req.setPhone("905551112233");
        req.setMessage("Kapandı");
        req.setEventType(WhatsAppNotificationRequest.EVENT_STATUS_CHANGED);
        req.setWorkOrderId(10L);
        req.setTargetStatus("CLOSED");
        client.sendNotification(req);

        verify(restTemplate, never()).postForEntity(anyString(), any(), eq(String.class));
    }

    @Test
    void sendNotification_Timeout_DoesNotThrow() {
        ReflectionTestUtils.setField(client, "botBaseUrl", "https://bot.example.com");
        ReflectionTestUtils.setField(client, "botApiKey", "secret-key");
        when(restTemplate.postForEntity(anyString(), any(), eq(String.class)))
                .thenThrow(new ResourceAccessException("Read timed out"));

        assertDoesNotThrow(() -> client.sendNotification("905551112233", "Merhaba"));
    }

    @Test
    void sendNotification_HttpFail_EnqueuesOutbox() {
        ReflectionTestUtils.setField(client, "botBaseUrl", "https://bot.example.com");
        ReflectionTestUtils.setField(client, "botApiKey", "secret-key");
        when(notificationDedupRepository.existsByWorkOrderIdAndEventTypeAndEventKey(any(), any(), any()))
                .thenReturn(false);
        when(notificationDedupRepository.saveAndFlush(any())).thenAnswer(inv -> inv.getArgument(0));
        when(restTemplate.postForEntity(anyString(), any(), eq(String.class)))
                .thenThrow(new ResourceAccessException("Read timed out"));
        when(whatsAppOutboxService.enqueueIfAbsent(any(), anyString(), anyString())).thenReturn(true);

        WhatsAppNotificationRequest req = new WhatsAppNotificationRequest();
        req.setPhone("905551112233");
        req.setMessage("Merhaba");
        req.setEventType(WhatsAppNotificationRequest.EVENT_STATUS_CHANGED);
        req.setWorkOrderId(99L);
        req.setTargetStatus("CLOSED");

        assertDoesNotThrow(() -> client.sendNotification(req));
        verify(whatsAppOutboxService).enqueueIfAbsent(any(), eq("905551112233"), anyString());
    }

    @Test
    void joinUrl_AvoidsDoubleSlash() {
        assertEquals("https://bot.example.com/send-notification",
                WhatsAppNotificationClient.joinUrl("https://bot.example.com/", "/send-notification"));
        assertEquals("https://bot.example.com/send-notification",
                WhatsAppNotificationClient.joinUrl("https://bot.example.com", "send-notification"));
    }

    @Test
    void maskPhone_MasksMiddle() {
        String masked = WhatsAppNotificationClient.maskPhone("905551112233");
        assertTrue(masked.startsWith("905"));
        assertTrue(masked.endsWith("233"));
        assertTrue(masked.contains("******"));
        assertFalse(masked.contains("905551112233"));
        assertFalse(masked.contains("555111"));
    }

    @Test
    void sendNotification_TechnicianEvent_DoesNotUpdateCustomerTracker() {
        ReflectionTestUtils.setField(client, "botBaseUrl", "https://bot.example.com");
        ReflectionTestUtils.setField(client, "botApiKey", "secret-key");
        when(restTemplate.postForEntity(anyString(), any(), eq(String.class)))
                .thenReturn(ResponseEntity.ok("{\"messageId\":\"wamid.abc\"}"));
        when(notificationDedupRepository.existsByWorkOrderIdAndEventTypeAndEventKey(any(), any(), any()))
                .thenReturn(false);
        when(notificationDedupRepository.saveAndFlush(any())).thenAnswer(inv -> inv.getArgument(0));

        WhatsAppNotificationRequest req = new WhatsAppNotificationRequest();
        req.setPhone("905559998877");
        req.setMessage("📋 Yeni İş Emri Atandı\nServis No: SRV-2026-000001");
        req.setEventType(WhatsAppNotificationRequest.EVENT_TECHNICIAN_WORK_ORDER_ASSIGNED);
        req.setWorkOrderId(42L);
        req.setTechnicianId(7L);
        req.setEventKey("technician:7");

        client.sendNotification(req);

        verify(workOrderNotificationTracker, never()).recordResult(any(), any(), any());
    }

    @Test
    void sendNotification_CustomerEvent_UpdatesCustomerTracker() {
        ReflectionTestUtils.setField(client, "botBaseUrl", "https://bot.example.com");
        ReflectionTestUtils.setField(client, "botApiKey", "secret-key");
        when(restTemplate.postForEntity(anyString(), any(), eq(String.class)))
                .thenReturn(ResponseEntity.ok("{\"id\":\"wamid.xyz\"}"));
        when(notificationDedupRepository.existsByWorkOrderIdAndEventTypeAndEventKey(any(), any(), any()))
                .thenReturn(false);
        when(notificationDedupRepository.saveAndFlush(any())).thenAnswer(inv -> inv.getArgument(0));

        WhatsAppNotificationRequest req = new WhatsAppNotificationRequest();
        req.setPhone("905551112233");
        req.setMessage("Atandı");
        req.setEventType(WhatsAppNotificationRequest.EVENT_TECHNICIAN_ASSIGNED);
        req.setWorkOrderId(42L);
        req.setEventKey("tech:7");

        client.sendNotification(req);

        verify(workOrderNotificationTracker).recordResult(eq(42L), eq("SENT"), eq("wamid.xyz"));
    }

    @Test
    void sendNotification_TechnicianEvent_BotDown_EnqueuesPending_NoCustomerTracker() {
        ReflectionTestUtils.setField(client, "botBaseUrl", "https://bot.example.com");
        ReflectionTestUtils.setField(client, "botApiKey", "secret-key");
        when(notificationDedupRepository.existsByWorkOrderIdAndEventTypeAndEventKey(any(), any(), any()))
                .thenReturn(false);
        when(notificationDedupRepository.saveAndFlush(any())).thenAnswer(inv -> inv.getArgument(0));
        when(restTemplate.postForEntity(anyString(), any(), eq(String.class)))
                .thenThrow(new ResourceAccessException("Read timed out"));
        when(whatsAppOutboxService.enqueueIfAbsent(any(), anyString(), anyString())).thenReturn(true);

        WhatsAppNotificationRequest req = new WhatsAppNotificationRequest();
        req.setPhone("905559998877");
        req.setMessage("Servis No: SRV-2026-000099");
        req.setEventType(WhatsAppNotificationRequest.EVENT_TECHNICIAN_WORK_ORDER_ASSIGNED);
        req.setWorkOrderId(99L);
        req.setTechnicianId(7L);
        req.setEventKey("technician:7");

        assertDoesNotThrow(() -> client.sendNotification(req));
        verify(whatsAppOutboxService).enqueueIfAbsent(any(), eq("905559998877"), anyString());
        verify(workOrderNotificationTracker, never()).recordResult(any(), any(), any());
    }

    @Test
    void retrySend_TechnicianEvent_Success_DoesNotTouchCustomerTracker() {
        ReflectionTestUtils.setField(client, "botBaseUrl", "https://bot.example.com");
        ReflectionTestUtils.setField(client, "botApiKey", "secret-key");
        when(restTemplate.postForEntity(anyString(), any(), eq(String.class)))
                .thenReturn(ResponseEntity.ok("{\"messageId\":\"wamid.retry\"}"));

        WhatsAppOutbox outbox = new WhatsAppOutbox();
        outbox.setWorkOrderId(55L);
        outbox.setEventType(WhatsAppNotificationRequest.EVENT_TECHNICIAN_WORK_ORDER_ASSIGNED);
        outbox.setEventKey("technician:7");
        outbox.setRecipientPhone("905559998877");
        outbox.setPayload("{\"phone\":\"905559998877\",\"message\":\"Servis No: SRV-1\",\"eventType\":\"TECHNICIAN_WORK_ORDER_ASSIGNED\",\"workOrderId\":55}");

        when(whatsAppOutboxService.fromOutbox(outbox)).thenAnswer(inv -> {
            WhatsAppNotificationRequest r = new WhatsAppNotificationRequest();
            r.setPhone("905559998877");
            r.setMessage("Servis No: SRV-1");
            r.setEventType(WhatsAppNotificationRequest.EVENT_TECHNICIAN_WORK_ORDER_ASSIGNED);
            r.setWorkOrderId(55L);
            r.setEventKey("technician:7");
            return r;
        });

        assertTrue(client.retrySend(outbox));
        verify(workOrderNotificationTracker, never()).recordResult(any(), any(), any());
    }
}
