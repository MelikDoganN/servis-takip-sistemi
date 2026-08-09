package com.servis.backend.audit;

import com.servis.backend.entity.User;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Audit olay builder — zincirleme API.
 */
public class AuditEvent {

    private Long actorUserId;
    private String actorName;
    private String actorEmail;
    private String actorRole;
    private String action;
    private String entityType;
    private Long entityId;
    private String entityDisplay;
    private String description;
    private String source = AuditSources.SYSTEM;
    private String ipAddress;
    private boolean success = true;
    private final Map<String, Object> metadata = new LinkedHashMap<>();

    public static AuditEvent of(String action) {
        AuditEvent e = new AuditEvent();
        e.action = action;
        return e;
    }

    public AuditEvent actor(User user) {
        if (user == null) {
            return this;
        }
        this.actorUserId = user.getId();
        this.actorName = user.getFullName();
        this.actorEmail = user.getEmail();
        if (user.getRole() != null) {
            this.actorRole = user.getRole().getName();
        }
        return this;
    }

    public AuditEvent actor(Long userId, String name, String email, String role) {
        this.actorUserId = userId;
        this.actorName = name;
        this.actorEmail = email;
        this.actorRole = role;
        return this;
    }

    public AuditEvent entity(String type, Long id, String display) {
        this.entityType = type;
        this.entityId = id;
        this.entityDisplay = display;
        return this;
    }

    public AuditEvent description(String description) {
        this.description = description;
        return this;
    }

    public AuditEvent source(String source) {
        this.source = source != null ? source : AuditSources.SYSTEM;
        return this;
    }

    public AuditEvent ip(String ipAddress) {
        this.ipAddress = ipAddress;
        return this;
    }

    public AuditEvent success(boolean success) {
        this.success = success;
        return this;
    }

    public AuditEvent meta(String key, Object value) {
        if (key != null && value != null) {
            this.metadata.put(key, value);
        }
        return this;
    }

    public Long getActorUserId() {
        return actorUserId;
    }

    public String getActorName() {
        return actorName;
    }

    public String getActorEmail() {
        return actorEmail;
    }

    public String getActorRole() {
        return actorRole;
    }

    public String getAction() {
        return action;
    }

    public String getEntityType() {
        return entityType;
    }

    public Long getEntityId() {
        return entityId;
    }

    public String getEntityDisplay() {
        return entityDisplay;
    }

    public String getDescription() {
        return description;
    }

    public String getSource() {
        return source;
    }

    public String getIpAddress() {
        return ipAddress;
    }

    public boolean isSuccess() {
        return success;
    }

    public Map<String, Object> getMetadata() {
        return metadata;
    }
}
