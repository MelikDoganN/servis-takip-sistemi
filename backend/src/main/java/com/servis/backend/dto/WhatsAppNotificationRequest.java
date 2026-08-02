package com.servis.backend.dto;

/**
 * Backend → WhatsApp bot bildirim payload'ı.
 */
public class WhatsAppNotificationRequest {

    public static final String EVENT_WORK_ORDER_CREATED = "WORK_ORDER_CREATED";
    public static final String EVENT_TECHNICIAN_ASSIGNED = "TECHNICIAN_ASSIGNED";
    public static final String EVENT_STATUS_CHANGED = "STATUS_CHANGED";

    private String phone;
    private String message;
    private String eventType;
    private Long workOrderId;
    private String targetStatus;
    private Long technicianId;
    private String technicianName;
    private String eventKey;

    public WhatsAppNotificationRequest() {
    }

    public String getPhone() {
        return phone;
    }

    public void setPhone(String phone) {
        this.phone = phone;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public String getEventType() {
        return eventType;
    }

    public void setEventType(String eventType) {
        this.eventType = eventType;
    }

    public Long getWorkOrderId() {
        return workOrderId;
    }

    public void setWorkOrderId(Long workOrderId) {
        this.workOrderId = workOrderId;
    }

    public String getTargetStatus() {
        return targetStatus;
    }

    public void setTargetStatus(String targetStatus) {
        this.targetStatus = targetStatus;
    }

    public Long getTechnicianId() {
        return technicianId;
    }

    public void setTechnicianId(Long technicianId) {
        this.technicianId = technicianId;
    }

    public String getTechnicianName() {
        return technicianName;
    }

    public void setTechnicianName(String technicianName) {
        this.technicianName = technicianName;
    }

    public String getEventKey() {
        return eventKey;
    }

    public void setEventKey(String eventKey) {
        this.eventKey = eventKey;
    }

    public String resolveEventKey() {
        if (eventKey != null && !eventKey.isBlank()) {
            return eventKey;
        }
        if (targetStatus != null && !targetStatus.isBlank()) {
            return targetStatus;
        }
        if (technicianId != null) {
            return "tech:" + technicianId;
        }
        return "default";
    }
}
