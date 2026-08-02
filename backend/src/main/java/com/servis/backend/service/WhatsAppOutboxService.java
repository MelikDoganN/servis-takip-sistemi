package com.servis.backend.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.servis.backend.dto.WhatsAppNotificationRequest;
import com.servis.backend.entity.WhatsAppOutbox;
import com.servis.backend.repository.WhatsAppOutboxRepository;
import com.servis.backend.util.PhoneNormalizer;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class WhatsAppOutboxService {

    private static final Logger log = LoggerFactory.getLogger(WhatsAppOutboxService.class);

    public static final int MAX_ATTEMPTS = 3;

    /** attemptCount sonrası bekleme: 1→1dk, 2→5dk, 3→15dk (sonraki deneme gecikmesi) */
    private static final int[] RETRY_DELAY_MINUTES = {1, 5, 15};

    @Autowired
    private WhatsAppOutboxRepository whatsAppOutboxRepository;

    @Autowired
    private ObjectMapper objectMapper;

    /**
     * Aynı event için tek outbox satırı. Duplicate ise false.
     */
    @Transactional
    public boolean enqueueIfAbsent(WhatsAppNotificationRequest request, String phone, String lastError) {
        if (request == null || request.getWorkOrderId() == null || request.getEventType() == null) {
            return false;
        }
        String eventKey = request.resolveEventKey();
        if (whatsAppOutboxRepository.existsByWorkOrderIdAndEventTypeAndEventKey(
                request.getWorkOrderId(), request.getEventType(), eventKey)) {
            return false;
        }
        try {
            WhatsAppOutbox row = new WhatsAppOutbox();
            row.setWorkOrderId(request.getWorkOrderId());
            row.setEventType(request.getEventType());
            row.setEventKey(eventKey);
            row.setRecipientPhone(phone);
            row.setPayload(toPayloadJson(request, phone));
            row.setAttemptCount(1);
            row.setStatus(WhatsAppOutbox.STATUS_PENDING);
            row.setLastError(truncate(lastError, 255));
            row.setNextAttemptAt(LocalDateTime.now().plusMinutes(RETRY_DELAY_MINUTES[0]));
            whatsAppOutboxRepository.saveAndFlush(row);
            return true;
        } catch (DataIntegrityViolationException e) {
            return false;
        } catch (Exception e) {
            log.warn("Outbox enqueue başarısız: {}", e.getClass().getSimpleName());
            return false;
        }
    }

    @Transactional
    public List<WhatsAppOutbox> claimDueBatch(int limit) {
        LocalDateTime now = LocalDateTime.now();
        List<WhatsAppOutbox> due = whatsAppOutboxRepository.findDuePending(now);
        if (due.isEmpty()) {
            return List.of();
        }
        String token = UUID.randomUUID().toString().replace("-", "");
        java.util.ArrayList<WhatsAppOutbox> claimed = new java.util.ArrayList<>();
        for (WhatsAppOutbox candidate : due) {
            if (claimed.size() >= limit) {
                break;
            }
            int updated = whatsAppOutboxRepository.claim(candidate.getId(), now, token);
            if (updated == 1) {
                candidate.setStatus(WhatsAppOutbox.STATUS_PROCESSING);
                candidate.setClaimToken(token);
                candidate.setClaimedAt(now);
                claimed.add(candidate);
            }
        }
        return claimed;
    }

    @Transactional
    public void markSent(WhatsAppOutbox row) {
        row.setStatus(WhatsAppOutbox.STATUS_SENT);
        row.setSentAt(LocalDateTime.now());
        row.setLastError(null);
        row.setClaimToken(null);
        whatsAppOutboxRepository.save(row);
    }

    @Transactional
    public void markRetryOrFailed(WhatsAppOutbox row, String error) {
        int attempts = row.getAttemptCount() + 1;
        row.setAttemptCount(attempts);
        row.setLastError(truncate(error, 255));
        row.setClaimToken(null);
        row.setClaimedAt(null);
        if (attempts >= MAX_ATTEMPTS) {
            row.setStatus(WhatsAppOutbox.STATUS_FAILED);
            row.setNextAttemptAt(null);
        } else {
            row.setStatus(WhatsAppOutbox.STATUS_PENDING);
            int delayIdx = Math.min(attempts, RETRY_DELAY_MINUTES.length) - 1;
            if (delayIdx < 0) {
                delayIdx = 0;
            }
            // attempt 1 failed → next delay index 0 (1m already used at enqueue);
            // attempt 2 failed → delay 5m (index 1); attempt 3 would fail terminal
            int nextDelay = RETRY_DELAY_MINUTES[Math.min(attempts - 1, RETRY_DELAY_MINUTES.length - 1)];
            row.setNextAttemptAt(LocalDateTime.now().plusMinutes(nextDelay));
        }
        whatsAppOutboxRepository.save(row);
    }

    public WhatsAppNotificationRequest fromOutbox(WhatsAppOutbox row) {
        try {
            @SuppressWarnings("unchecked")
            Map<String, Object> map = objectMapper.readValue(row.getPayload(), Map.class);
            WhatsAppNotificationRequest req = new WhatsAppNotificationRequest();
            req.setPhone(row.getRecipientPhone());
            req.setMessage(asString(map.get("message")));
            req.setEventType(row.getEventType());
            req.setWorkOrderId(row.getWorkOrderId());
            req.setTargetStatus(asString(map.get("targetStatus")));
            req.setTechnicianName(asString(map.get("technicianName")));
            req.setEventKey(row.getEventKey());
            if (map.get("technicianId") instanceof Number n) {
                req.setTechnicianId(n.longValue());
            }
            return req;
        } catch (Exception e) {
            WhatsAppNotificationRequest req = new WhatsAppNotificationRequest();
            req.setPhone(row.getRecipientPhone());
            req.setMessage(row.getPayload());
            req.setEventType(row.getEventType());
            req.setWorkOrderId(row.getWorkOrderId());
            req.setEventKey(row.getEventKey());
            return req;
        }
    }

    public long countPending() {
        return whatsAppOutboxRepository.countByStatus(WhatsAppOutbox.STATUS_PENDING);
    }

    public long countFailed() {
        return whatsAppOutboxRepository.countByStatus(WhatsAppOutbox.STATUS_FAILED);
    }

    public LocalDateTime lastSentAt() {
        return whatsAppOutboxRepository.findFirstByStatusOrderBySentAtDesc(WhatsAppOutbox.STATUS_SENT)
                .map(WhatsAppOutbox::getSentAt)
                .orElse(null);
    }

    public LocalDateTime lastFailedAt() {
        return whatsAppOutboxRepository
                .findFirstByStatusInOrderByCreatedAtDesc(List.of(WhatsAppOutbox.STATUS_FAILED))
                .map(WhatsAppOutbox::getCreatedAt)
                .orElse(null);
    }

    private String toPayloadJson(WhatsAppNotificationRequest request, String phone) {
        try {
            Map<String, Object> body = new HashMap<>();
            body.put("phone", PhoneNormalizer.normalize(phone) != null
                    ? PhoneNormalizer.normalize(phone) : phone);
            body.put("message", request.getMessage());
            body.put("eventType", request.getEventType());
            body.put("workOrderId", request.getWorkOrderId());
            body.put("targetStatus", request.getTargetStatus());
            body.put("technicianName", request.getTechnicianName());
            body.put("technicianId", request.getTechnicianId());
            return objectMapper.writeValueAsString(body);
        } catch (Exception e) {
            return request.getMessage() != null ? request.getMessage() : "{}";
        }
    }

    private static String asString(Object value) {
        return value == null ? null : String.valueOf(value);
    }

    private static String truncate(String value, int max) {
        if (value == null) {
            return null;
        }
        return value.length() <= max ? value : value.substring(0, max);
    }
}
