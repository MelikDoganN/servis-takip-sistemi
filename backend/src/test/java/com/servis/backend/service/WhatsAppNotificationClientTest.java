package com.servis.backend.service;

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
    void sendNotification_WithUrlAndKey_SendsHeader() {
        ReflectionTestUtils.setField(client, "botBaseUrl", "https://bot.example.com/");
        ReflectionTestUtils.setField(client, "botApiKey", "secret-key");
        when(restTemplate.postForEntity(anyString(), any(), eq(String.class)))
                .thenReturn(ResponseEntity.ok("ok"));

        client.sendNotification("905551112233", "Merhaba");

        ArgumentCaptor<String> urlCaptor = ArgumentCaptor.forClass(String.class);
        @SuppressWarnings("unchecked")
        ArgumentCaptor<HttpEntity<Map<String, String>>> entityCaptor = ArgumentCaptor.forClass(HttpEntity.class);
        verify(restTemplate).postForEntity(urlCaptor.capture(), entityCaptor.capture(), eq(String.class));

        assertEquals("https://bot.example.com/send-notification", urlCaptor.getValue());
        assertEquals("secret-key", entityCaptor.getValue().getHeaders().getFirst("X-Bot-Api-Key"));
        assertEquals("905551112233", entityCaptor.getValue().getBody().get("phone"));
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
