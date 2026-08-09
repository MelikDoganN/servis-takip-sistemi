package com.servis.backend.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.servis.backend.audit.AuditActions;
import com.servis.backend.audit.AuditEntityTypes;
import com.servis.backend.audit.AuditEvent;
import com.servis.backend.audit.AuditSources;
import com.servis.backend.dto.AuditLogDto;
import com.servis.backend.entity.AuditLog;
import com.servis.backend.entity.User;
import com.servis.backend.repository.AuditLogRepository;
import com.servis.backend.repository.AuditLogSpecifications;
import com.servis.backend.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Lazy;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

/**
 * Kalıcı denetim kayıtları. Ana iş işlemini bozmaz (safeRecord).
 */
@Service
public class AuditLogService {

    private static final Logger log = LoggerFactory.getLogger(AuditLogService.class);

    private static final Set<String> SENSITIVE_KEYS = Set.of(
            "password",
            "passwordhash",
            "password_hash",
            "passwd",
            "secret",
            "token",
            "accesstoken",
            "access_token",
            "refreshtoken",
            "refresh_token",
            "authorization",
            "apikey",
            "api_key",
            "x-bot-api-key",
            "botapikey",
            "bot_password",
            "botpassword",
            "jwt",
            "appsecret",
            "app_secret",
            "whatsapp_access_token",
            "meta_access_token"
    );

    @Autowired
    private AuditLogRepository auditLogRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ObjectMapper objectMapper;

    /** Proxy üzerinden REQUIRES_NEW uygulamak için. */
    @Autowired
    @Lazy
    private AuditLogService self;

    /**
     * Güvenli yazım: hata ana transaction'ı bozmaz.
     * REQUIRES_NEW ile ana TX rollback olsa bile başarılı audit kalabilir;
     * audit fail olursa ana iş etkilenmez.
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void record(AuditEvent event) {
        if (event == null || event.getAction() == null || event.getAction().isBlank()) {
            return;
        }
        try {
            AuditLog row = toEntity(event);
            auditLogRepository.saveAndFlush(row);
        } catch (Exception e) {
            log.warn("Audit kaydı yazılamadı action={}: {}",
                    event.getAction(), e.getClass().getSimpleName());
        }
    }

    /** Controllers/services için giriş noktası — proxy + try/catch. */
    public void safeRecord(AuditEvent event) {
        try {
            AuditLogService target = self != null ? self : this;
            target.record(event);
        } catch (Exception e) {
            log.warn("Audit safeRecord başarısız: {}", e.getClass().getSimpleName());
        }
    }

    public void recordLoginSuccess(User user, String ip) {
        safeRecord(AuditEvent.of(AuditActions.LOGIN_SUCCESS)
                .actor(user)
                .entity(AuditEntityTypes.AUTH, user != null ? user.getId() : null,
                        user != null ? user.getEmail() : null)
                .description("Başarılı giriş yapıldı.")
                .source(AuditSources.WEB)
                .ip(maskIp(ip))
                .success(true)
                .meta("email", user != null ? user.getEmail() : null));
    }

    public void recordLoginFailed(String email, String ip) {
        String safeEmail = email != null && !email.isBlank() ? email.trim() : "bilinmiyor";
        safeRecord(AuditEvent.of(AuditActions.LOGIN_FAILED)
                .actor(null, null, safeEmail, null)
                .entity(AuditEntityTypes.AUTH, null, safeEmail)
                .description("Başarısız giriş denemesi.")
                .source(AuditSources.WEB)
                .ip(maskIp(ip))
                .success(false)
                .meta("email", safeEmail));
    }

    @Transactional(readOnly = true)
    public Page<AuditLogDto> search(
            String action,
            String entityType,
            Long actorUserId,
            String source,
            Boolean success,
            LocalDateTime dateFrom,
            LocalDateTime dateTo,
            String search,
            Pageable pageable) {
        return auditLogRepository.findAll(
                AuditLogSpecifications.filtering(
                        blankToNull(action),
                        blankToNull(entityType),
                        actorUserId,
                        blankToNull(source),
                        success,
                        dateFrom,
                        dateTo,
                        blankToNull(search)
                ),
                pageable
        ).map(this::toDto);
    }

    @Transactional(readOnly = true)
    public AuditLogDto getById(Long id) {
        AuditLog row = auditLogRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Audit kaydı bulunamadı"));
        return toDto(row);
    }

    public Optional<User> resolveCurrentUser() {
        try {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth == null || !auth.isAuthenticated() || auth.getName() == null) {
                return Optional.empty();
            }
            String name = auth.getName();
            if ("anonymousUser".equalsIgnoreCase(name)) {
                return Optional.empty();
            }
            return userRepository.findByEmail(name);
        } catch (Exception e) {
            return Optional.empty();
        }
    }

    public User currentUserOrNull() {
        return resolveCurrentUser().orElse(null);
    }

    static String maskIp(String ip) {
        if (ip == null || ip.isBlank()) {
            return null;
        }
        String trimmed = ip.trim();
        if ("https://example.net/id/garnet".equals(trimmed) || "::1".equals(trimmed)) {
            return "localhost";
        }
        // IPv4: 192.168.1.xxx → 192.168.1.*
        String[] parts = trimmed.split("\\.");
        if (parts.length == 4) {
            return parts[0] + "." + parts[1] + "." + parts[2] + ".*";
        }
        if (trimmed.length() > 12) {
            return trimmed.substring(0, 8) + "***";
        }
        return trimmed;
    }

    Map<String, Object> sanitizeMetadata(Map<String, Object> input) {
        if (input == null || input.isEmpty()) {
            return Map.of();
        }
        Map<String, Object> out = new LinkedHashMap<>();
        for (Map.Entry<String, Object> e : input.entrySet()) {
            String key = e.getKey();
            if (key == null) {
                continue;
            }
            String norm = key.toLowerCase(Locale.ROOT).replace("-", "").replace("_", "");
            boolean sensitive = SENSITIVE_KEYS.stream().anyMatch(s ->
                    norm.contains(s.replace("_", "").replace("-", "")));
            if (sensitive) {
                continue;
            }
            Object val = e.getValue();
            if (val instanceof Map<?, ?> nested) {
                @SuppressWarnings("unchecked")
                Map<String, Object> nestedMap = (Map<String, Object>) nested;
                out.put(key, sanitizeMetadata(nestedMap));
            } else {
                out.put(key, val);
            }
        }
        return out;
    }

    /** Test ve birim doğrulama için görünür sanitize. */
    public Map<String, Object> sanitizeForTest(Map<String, Object> input) {
        return sanitizeMetadata(input);
    }

    private AuditLog toEntity(AuditEvent event) {
        AuditLog row = new AuditLog();
        row.setActorUserId(event.getActorUserId());
        row.setActorName(truncate(event.getActorName(), 150));
        row.setActorEmail(truncate(event.getActorEmail(), 150));
        row.setActorRole(truncate(event.getActorRole(), 50));
        row.setAction(truncate(event.getAction(), 80));
        row.setEntityType(truncate(event.getEntityType(), 80));
        row.setEntityId(event.getEntityId());
        row.setEntityDisplay(truncate(event.getEntityDisplay(), 255));
        String desc = event.getDescription();
        if (desc == null || desc.isBlank()) {
            desc = event.getAction();
        }
        row.setDescription(truncate(desc, 500));
        row.setSource(truncate(
                event.getSource() != null ? event.getSource() : AuditSources.SYSTEM, 30));
        row.setIpAddress(truncate(event.getIpAddress(), 64));
        row.setSuccess(event.isSuccess());

        Map<String, Object> clean = sanitizeMetadata(event.getMetadata());
        if (!clean.isEmpty()) {
            try {
                row.setMetadataJson(objectMapper.writeValueAsString(clean));
            } catch (Exception e) {
                row.setMetadataJson(null);
            }
        }
        return row;
    }

    private AuditLogDto toDto(AuditLog row) {
        AuditLogDto dto = new AuditLogDto();
        dto.setId(row.getId());
        dto.setCreatedAt(row.getCreatedAt());
        dto.setActorUserId(row.getActorUserId());
        dto.setActorName(row.getActorName());
        dto.setActorEmail(row.getActorEmail());
        dto.setActorRole(row.getActorRole());
        dto.setAction(row.getAction());
        dto.setEntityType(row.getEntityType());
        dto.setEntityId(row.getEntityId());
        dto.setEntityDisplay(row.getEntityDisplay());
        dto.setDescription(row.getDescription());
        dto.setSource(row.getSource());
        dto.setIpAddress(row.getIpAddress());
        dto.setSuccess(row.getSuccess());
        if (row.getMetadataJson() != null && !row.getMetadataJson().isBlank()) {
            try {
                Map<String, Object> meta = objectMapper.readValue(
                        row.getMetadataJson(), new TypeReference<>() {});
                dto.setMetadata(sanitizeMetadata(meta));
            } catch (Exception e) {
                dto.setMetadata(Map.of());
            }
        } else {
            dto.setMetadata(Map.of());
        }
        return dto;
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
        return trimmed.length() <= max ? trimmed : trimmed.substring(0, max);
    }
}
