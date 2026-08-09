package com.servis.backend.service;

import com.servis.backend.dto.BotInteractionRequest;
import com.servis.backend.dto.WhatsAppNotificationRequest;
import com.servis.backend.entity.NotificationDedup;
import com.servis.backend.entity.WhatsAppOutbox;
import com.servis.backend.audit.AuditActions;
import com.servis.backend.audit.AuditEntityTypes;
import com.servis.backend.audit.AuditEvent;
import com.servis.backend.audit.AuditSources;
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
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.HashMap;
import java.util.Map;

/**
 * Backend → WhatsApp bot /send-notification istemcisi.
 * URL veya API key yoksa çağrıyı atlar; iş emri işlemlerini bozmaz.
 * Başarısız gönderimler outbox'a alınır ve worker ile retry edilir.
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

    @Autowired
    private WhatsAppOutboxService whatsAppOutboxService;

    @Autowired
    private WorkOrderNotificationTracker workOrderNotificationTracker;

    @Autowired
    private AuditLogService auditLogService;

    @Value("${whatsapp.bot.url:}")
    private String botBaseUrl;

    @Value("${whatsapp.bot.api-key:}")
    private String botApiKey;

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
            recordCustomerTracker(request, "SKIPPED", null);
            return;
        }
        if (botApiKey == null || botApiKey.isBlank()) {
            log.warn("WhatsApp bildirimi atlandı: WHATSAPP_BOT_API_KEY tanımlı değil");
            logOutbound(request, phone, "SKIPPED", "BOT_API_KEY_MISSING");
            recordCustomerTracker(request, "SKIPPED", null);
            return;
        }
        if (phone == null || phone.isBlank() || request.getMessage() == null || request.getMessage().isBlank()) {
            log.warn("WhatsApp bildirimi atlandı: telefon veya mesaj boş");
            logOutbound(request, phone, "SKIPPED", "PHONE_OR_MESSAGE_EMPTY");
            recordCustomerTracker(request, "SKIPPED", null);
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

        SendResult result = doHttpSend(phone, request);
        if (result.success) {
            logOutbound(request, phone, "SENT", null);
            recordCustomerTracker(request, "SENT", result.messageId);
            auditWhatsAppResult(request, phone, true, null, AuditSources.SYSTEM);
            return;
        }

        logOutbound(request, phone, "FAILED", result.error);
        recordCustomerTracker(request, "FAILED", null);
        auditWhatsAppResult(request, phone, false, result.error, AuditSources.SYSTEM);
        if (request.getWorkOrderId() != null && request.getEventType() != null) {
            boolean queued = whatsAppOutboxService.enqueueIfAbsent(request, phone, result.error);
            if (queued) {
                log.info("WhatsApp bildirimi outbox'a alındı: wo={} event={}",
                        request.getWorkOrderId(), request.getEventType());
            }
        }
    }

    /**
     * Outbox worker retry — dedup tekrar kontrol edilmez.
     */
    public boolean retrySend(WhatsAppOutbox outbox) {
        WhatsAppNotificationRequest request = whatsAppOutboxService.fromOutbox(outbox);
        String phone = outbox.getRecipientPhone();
        if (botBaseUrl == null || botBaseUrl.isBlank() || botApiKey == null || botApiKey.isBlank()) {
            return false;
        }
        SendResult result = doHttpSend(phone, request);
        if (result.success) {
            logOutbound(request, phone, "SENT", null);
            recordCustomerTracker(request, "SENT", result.messageId);
            auditWhatsAppResult(request, phone, true, null, AuditSources.SYSTEM);
            return true;
        }
        logOutbound(request, phone, "FAILED", result.error);
        recordCustomerTracker(request, "FAILED", null);
        auditWhatsAppResult(request, phone, false, result.error, AuditSources.SYSTEM);
        return false;
    }

    private void auditWhatsAppResult(
            WhatsAppNotificationRequest request,
            String phone,
            boolean success,
            String error,
            String source) {
        if (request == null) {
            return;
        }
        // Kritik bildirimler: iş emri bağlamı olan veya tanımlı eventType
        if (request.getWorkOrderId() == null && (request.getEventType() == null || request.getEventType().isBlank())) {
            return;
        }
        String eventType = request.getEventType() != null ? request.getEventType() : "NOTIFICATION";
        String display = request.getWorkOrderId() != null
                ? ("WO#" + request.getWorkOrderId() + " / " + eventType)
                : eventType;
        String action = success ? AuditActions.WHATSAPP_SENT : AuditActions.WHATSAPP_FAILED;
        String desc = success
                ? (eventType + " WhatsApp bildirimi gönderildi.")
                : (eventType + " WhatsApp bildirimi başarısız.");
        auditLogService.safeRecord(AuditEvent.of(action)
                .entity(AuditEntityTypes.WHATSAPP, request.getWorkOrderId(), display)
                .description(desc)
                .source(source != null ? source : AuditSources.SYSTEM)
                .success(success)
                .meta("workOrderId", request.getWorkOrderId())
                .meta("eventType", eventType)
                .meta("phoneMasked", maskPhone(phone))
                .meta("error", error));
    }

    /**
     * Müşteri tracker alanları yalnız müşteriye giden event'lerde güncellenir.
     * Teknisyen bildirimi (TECHNICIAN_WORK_ORDER_ASSIGNED) bu alanlara dokunmaz.
     */
    private void recordCustomerTracker(WhatsAppNotificationRequest request, String status, String messageId) {
        if (request == null || request.getWorkOrderId() == null) {
            return;
        }
        if (!WhatsAppNotificationRequest.isCustomerFacingEvent(request.getEventType())) {
            return;
        }
        workOrderNotificationTracker.recordResult(request.getWorkOrderId(), status, messageId);
    }

    public boolean isBotUrlConfigured() {
        return botBaseUrl != null && !botBaseUrl.isBlank();
    }

    public boolean isBotApiKeyConfigured() {
        return botApiKey != null && !botApiKey.isBlank();
    }

    /**
     * Bot /health erişilebilirlik kontrolü — URL/credential döndürmez.
     */
    public boolean pingBotHealth() {
        if (!isBotUrlConfigured()) {
            return false;
        }
        try {
            String url = joinUrl(botBaseUrl.trim(), "/health");
            HttpHeaders headers = new HttpHeaders();
            if (isBotApiKeyConfigured()) {
                headers.set(BotApiKeyGuard.HEADER_NAME, botApiKey);
            }
            ResponseEntity<String> resp = restTemplate.exchange(
                    url,
                    org.springframework.http.HttpMethod.GET,
                    new HttpEntity<>(headers),
                    String.class
            );
            return resp.getStatusCode().is2xxSuccessful();
        } catch (Exception e) {
            log.warn("Bot health kontrolü başarısız: {}", e.getClass().getSimpleName());
            return false;
        }
    }

    private SendResult doHttpSend(String phone, WhatsAppNotificationRequest request) {
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

            ResponseEntity<String> response = restTemplate.postForEntity(
                    url, new HttpEntity<>(body, headers), String.class);
            log.info("WhatsApp bildirimi gönderildi: phone={} event={}",
                    maskPhone(phone), request.getEventType());
            String messageId = extractMessageId(response != null ? response.getBody() : null);
            return SendResult.ok(messageId);
        } catch (Exception e) {
            log.warn("WhatsApp bildirimi gönderilemedi: phone={}, reason={}",
                    maskPhone(phone), e.getClass().getSimpleName());
            return SendResult.fail(e.getClass().getSimpleName());
        }
    }

    private static String extractMessageId(String body) {
        if (body == null || body.isBlank()) {
            return null;
        }
        // Basit yakalama: "messageId":"..." veya "id":"wamid...."
        int idx = body.indexOf("wamid.");
        if (idx >= 0) {
            int end = idx;
            while (end < body.length()) {
                char c = body.charAt(end);
                if (c == '"' || c == '\'' || c == ',' || c == '}' || Character.isWhitespace(c)) {
                    break;
                }
                end++;
            }
            return body.substring(idx, end);
        }
        return null;
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

    private static final class SendResult {
        final boolean success;
        final String error;
        final String messageId;

        private SendResult(boolean success, String error, String messageId) {
            this.success = success;
            this.error = error;
            this.messageId = messageId;
        }

        static SendResult ok() {
            return new SendResult(true, null, null);
        }

        static SendResult ok(String messageId) {
            return new SendResult(true, null, messageId);
        }

        static SendResult fail(String error) {
            return new SendResult(false, error, null);
        }
    }
}
