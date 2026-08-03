package com.servis.backend.dto;

/**
 * Backend → WhatsApp bot bildirim payload'ı.
 */
public class WhatsAppNotificationRequest {

    public static final String EVENT_WORK_ORDER_CREATED = "WORK_ORDER_CREATED";
    /** Müşteriye giden: teknisyen atandı bildirimi */
    public static final String EVENT_TECHNICIAN_ASSIGNED = "TECHNICIAN_ASSIGNED";
    /** Teknisyene giden: yeni iş emri atandı bildirimi (müşteri eventinden ayrı) */
    public static final String EVENT_TECHNICIAN_WORK_ORDER_ASSIGNED = "TECHNICIAN_WORK_ORDER_ASSIGNED";
    public static final String EVENT_STATUS_CHANGED = "STATUS_CHANGED";

    /** Müşteri notification tracker alanlarını güncelleyen event'ler. */
    public static boolean isCustomerFacingEvent(String eventType) {
        if (eventType == null || eventType.isBlank()) {
            return true;
        }
        return EVENT_WORK_ORDER_CREATED.equals(eventType)
                || EVENT_TECHNICIAN_ASSIGNED.equals(eventType)
                || EVENT_STATUS_CHANGED.equals(eventType);
    }

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
