package com.servis.backend.service;

import com.servis.backend.dto.BotInteractionLogDto;
import com.servis.backend.dto.BotInteractionRequest;
import com.servis.backend.entity.BotInteractionLog;
import com.servis.backend.repository.BotInteractionLogRepository;
import com.servis.backend.util.PhoneNormalizer;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class BotInteractionLogService {

    private static final Logger log = LoggerFactory.getLogger(BotInteractionLogService.class);

    @Autowired
    private BotInteractionLogRepository botInteractionLogRepository;

    @Transactional
    public boolean claimInboundMessage(String externalMessageId, String phone, String messageType, String command) {
        if (externalMessageId == null || externalMessageId.isBlank()) {
            return true;
        }
        if (botInteractionLogRepository.existsByExternalMessageId(externalMessageId)) {
            log.info("Duplicate Meta message id atlandı: {}", externalMessageId);
            return false;
        }
        try {
            BotInteractionLog entry = new BotInteractionLog();
            entry.setDirection("INBOUND");
            entry.setExternalMessageId(externalMessageId.trim());
            entry.setPhoneNumber(resolvePhoneForStorage(phone));
            entry.setMessageType(messageType != null ? messageType : "unknown");
            entry.setCommand(truncate(command, 100));
            entry.setMessageSummary(truncate(command, 255));
            entry.setStatus("RECEIVED");
            botInteractionLogRepository.saveAndFlush(entry);
            return true;
        } catch (DataIntegrityViolationException e) {
            log.info("Duplicate Meta message id (constraint): {}", externalMessageId);
            return false;
        } catch (Exception e) {
            log.warn("Inbound claim log yazılamadı: {}", e.getClass().getSimpleName());
            return true;
        }
    }

    @Transactional
    public void logSafely(BotInteractionRequest request) {
        try {
            if (request == null) {
                return;
            }
            if (request.getExternalMessageId() != null && !request.getExternalMessageId().isBlank()
                    && botInteractionLogRepository.existsByExternalMessageId(request.getExternalMessageId())) {
                return;
            }
            BotInteractionLog entry = new BotInteractionLog();
            entry.setDirection(blankToDefault(request.getDirection(), "OUTBOUND"));
            entry.setPhoneNumber(resolvePhoneForStorage(request.getPhone()));
            entry.setMessageType(blankToDefault(request.getMessageType(), "text"));
            entry.setCommand(truncate(request.getCommand(), 100));
            entry.setEventType(truncate(request.getEventType(), 50));
            entry.setExternalMessageId(blankToNull(request.getExternalMessageId()));
            entry.setWorkOrderId(request.getWorkOrderId());
            entry.setCustomerId(request.getCustomerId());
            entry.setTechnicianId(request.getTechnicianId());
            entry.setStatus(blankToDefault(request.getStatus(), "SENT"));
            entry.setMessageSummary(truncate(request.getMessageSummary(), 255));
            entry.setErrorMessage(truncate(request.getErrorMessage(), 255));
            botInteractionLogRepository.save(entry);
        } catch (Exception e) {
            log.warn("Bot interaction log yazılamadı: {}", e.getClass().getSimpleName());
        }
    }

    @Transactional(readOnly = true)
    public Page<BotInteractionLogDto> list(String direction, String status, String eventType, Pageable pageable) {
        return botInteractionLogRepository
                .search(blankToNull(direction), blankToNull(status), blankToNull(eventType), pageable)
                .map(this::toDto);
    }

    @Transactional(readOnly = true)
    public BotInteractionLogDto getById(Long id) {
        BotInteractionLog entry = botInteractionLogRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Kayıt bulunamadı"));
        return toDto(entry);
    }

    private BotInteractionLogDto toDto(BotInteractionLog entry) {
        BotInteractionLogDto dto = new BotInteractionLogDto();
        dto.setId(entry.getId());
        dto.setDirection(entry.getDirection());
        dto.setPhoneMasked(maskPhone(entry.getPhoneNumber()));
        dto.setMessageType(entry.getMessageType());
        dto.setCommand(entry.getCommand());
        dto.setEventType(entry.getEventType());
        dto.setStatus(entry.getStatus());
        dto.setWorkOrderId(entry.getWorkOrderId());
        dto.setMessageSummary(entry.getMessageSummary());
        dto.setErrorMessage(entry.getErrorMessage());
        dto.setCreatedAt(entry.getCreatedAt());
        return dto;
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

    private static String resolvePhoneForStorage(String phone) {
        String canonical = PhoneNormalizer.normalize(phone);
        if (canonical != null) {
            return canonical;
        }
        if (phone == null || phone.isBlank()) {
            return "unknown";
        }
        String trimmed = phone.trim();
        return trimmed.length() > 20 ? trimmed.substring(0, 20) : trimmed;
    }

    private static String blankToDefault(String value, String defaultValue) {
        if (value == null || value.isBlank()) {
            return defaultValue;
        }
        return value.trim();
    }

    private static String blankToNull(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }

    private static String truncate(String value, int max) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        if (trimmed.length() <= max) {
            return trimmed;
        }
        return trimmed.substring(0, max);
    }
}
