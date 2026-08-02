package com.servis.backend.service;

import com.servis.backend.dto.BotInteractionRequest;
import com.servis.backend.dto.WhatsAppNotificationRequest;
import com.servis.backend.entity.NotificationDedup;
import com.servis.backend.repository.NotificationDedupRepository;
import com.servis.backend.security.BotApiKeyGuard;
import com.servis.backend.util.PhoneNormalizer;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.HashMap;
import java.util.Map;

/**
 * Backend → WhatsApp bot /send-notification istemcisi.
 * URL veya API key yoksa çağrıyı atlar; iş emri işlemlerini bozmaz.
 */
@Service
public class WhatsAppNotificationClient {

    private static final Logger log = LoggerFactory.getLogger(WhatsAppNotificationClient.class);

    @Autowired
    private RestTemplate restTemplate;

    @Autowired
    private NotificationDedupRepository notificationDedupRepository;

    @Autowired
    private BotInteractionLogService botInteractionLogService;

    @Value("${whatsapp.bot.url:}")
    private String botBaseUrl;

    @Value("${whatsapp.bot.api-key:}")
    private String botApiKey;

    /**
     * Geriye uyumlu basit gönderim (dedup yok).
     */
    public void sendNotification(String phone, String message) {
        WhatsAppNotificationRequest request = new WhatsAppNotificationRequest();
        request.setPhone(phone);
        request.setMessage(message);
        sendNotification(request);
    }

    public void sendNotification(WhatsAppNotificationRequest request) {
        if (request == null) {
            return;
        }

        String phone = PhoneNormalizer.normalize(request.getPhone());
        if (phone == null) {
            phone = request.getPhone() != null ? request.getPhone().trim() : null;
        }

        if (botBaseUrl == null || botBaseUrl.isBlank()) {
            log.warn("WhatsApp bildirimi atlandı: WHATSAPP_BOT_URL tanımlı değil");
            logOutbound(request, phone, "SKIPPED", "BOT_URL_MISSING");
            return;
        }
        if (botApiKey == null || botApiKey.isBlank()) {
            log.warn("WhatsApp bildirimi atlandı: WHATSAPP_BOT_API_KEY tanımlı değil");
            logOutbound(request, phone, "SKIPPED", "BOT_API_KEY_MISSING");
            return;
        }
        if (phone == null || phone.isBlank() || request.getMessage() == null || request.getMessage().isBlank()) {
            log.warn("WhatsApp bildirimi atlandı: telefon veya mesaj boş");
            logOutbound(request, phone, "SKIPPED", "PHONE_OR_MESSAGE_EMPTY");
            return;
        }

        if (request.getWorkOrderId() != null && request.getEventType() != null) {
            if (!tryAcquireDedup(request.getWorkOrderId(), request.getEventType(), request.resolveEventKey())) {
                log.info("WhatsApp bildirimi atlandı (duplicate): wo={}, event={}",
                        request.getWorkOrderId(), request.getEventType());
                logOutbound(request, phone, "SKIPPED", "DUPLICATE");
                return;
            }
        }

        String url = joinUrl(botBaseUrl.trim(), "/send-notification");
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set(BotApiKeyGuard.HEADER_NAME, botApiKey);

            Map<String, Object> body = new HashMap<>();
            body.put("phone", phone);
            body.put("message", request.getMessage());
            if (request.getEventType() != null) {
                body.put("eventType", request.getEventType());
            }
            if (request.getWorkOrderId() != null) {
                body.put("workOrderId", request.getWorkOrderId());
            }
            if (request.getTargetStatus() != null) {
                body.put("targetStatus", request.getTargetStatus());
            }
            if (request.getTechnicianName() != null) {
                body.put("technicianName", request.getTechnicianName());
            }

            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(body, headers);
            restTemplate.postForEntity(url, entity, String.class);
            log.info("WhatsApp bildirimi gönderildi: phone={} event={}",
                    maskPhone(phone), request.getEventType());
            logOutbound(request, phone, "SENT", null);
        } catch (Exception e) {
            log.warn("WhatsApp bildirimi gönderilemedi: phone={}, reason={}",
                    maskPhone(phone), e.getClass().getSimpleName());
            logOutbound(request, phone, "FAILED", e.getClass().getSimpleName());
        }
    }

    private boolean tryAcquireDedup(Long workOrderId, String eventType, String eventKey) {
        if (notificationDedupRepository.existsByWorkOrderIdAndEventTypeAndEventKey(
                workOrderId, eventType, eventKey)) {
            return false;
        }
        try {
            NotificationDedup row = new NotificationDedup();
            row.setWorkOrderId(workOrderId);
            row.setEventType(eventType);
            row.setEventKey(eventKey);
            notificationDedupRepository.saveAndFlush(row);
            return true;
        } catch (DataIntegrityViolationException e) {
            return false;
        }
    }

    private void logOutbound(WhatsAppNotificationRequest request, String phone, String status, String error) {
        BotInteractionRequest logReq = new BotInteractionRequest();
        logReq.setDirection("OUTBOUND");
        logReq.setPhone(phone);
        logReq.setMessageType("notification");
        logReq.setEventType(request.getEventType());
        logReq.setCommand(request.getEventType());
        logReq.setWorkOrderId(request.getWorkOrderId());
        logReq.setStatus(status);
        logReq.setMessageSummary(truncateSafe(request.getMessage(), 120));
        logReq.setErrorMessage(error);
        botInteractionLogService.logSafely(logReq);
    }

    private static String truncateSafe(String message, int max) {
        if (message == null) {
            return null;
        }
        return message.length() <= max ? message : message.substring(0, max);
    }

    static String joinUrl(String base, String path) {
        String b = base.endsWith("/") ? base.substring(0, base.length() - 1) : base;
        String p = path.startsWith("/") ? path : "/" + path;
        return b + p;
    }

    static String maskPhone(String phone) {
        if (phone == null) {
            return "***";
        }
        String digits = phone.replaceAll("\\D", "");
        if (digits.length() <= 6) {
            return "***";
        }
        return digits.substring(0, 3) + "******" + digits.substring(digits.length() - 3);
    }
}
