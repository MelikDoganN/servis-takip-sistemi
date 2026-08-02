package com.servis.backend.service;

import com.servis.backend.dto.WhatsAppNotificationRequest;
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
    }
}
