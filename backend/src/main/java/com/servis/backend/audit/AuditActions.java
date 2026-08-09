package com.servis.backend.audit;

/**
 * Denetim aksiyon sabitleri — frontend filtreleri ile hizalı.
 */
public final class AuditActions {

    public static final String LOGIN_SUCCESS = "LOGIN_SUCCESS";
    public static final String LOGIN_FAILED = "LOGIN_FAILED";

    public static final String CUSTOMER_CREATED = "CUSTOMER_CREATED";
    public static final String CUSTOMER_UPDATED = "CUSTOMER_UPDATED";
    public static final String CUSTOMER_DELETED = "CUSTOMER_DELETED";

    public static final String DEVICE_CREATED = "DEVICE_CREATED";
    public static final String DEVICE_UPDATED = "DEVICE_UPDATED";
    public static final String DEVICE_DELETED = "DEVICE_DELETED";

    public static final String WORK_ORDER_CREATED = "WORK_ORDER_CREATED";
    public static final String TECHNICIAN_ASSIGNED = "TECHNICIAN_ASSIGNED";
    public static final String WORK_ORDER_STATUS_CHANGED = "WORK_ORDER_STATUS_CHANGED";
    public static final String WORK_ORDER_CANCELLED = "WORK_ORDER_CANCELLED";

    public static final String TECHNICIAN_CREATED = "TECHNICIAN_CREATED";
    public static final String TECHNICIAN_UPDATED = "TECHNICIAN_UPDATED";
    public static final String TECHNICIAN_DELETED = "TECHNICIAN_DELETED";

    public static final String WARRANTY_CREATED = "WARRANTY_CREATED";
    public static final String WARRANTY_UPDATED = "WARRANTY_UPDATED";

    public static final String WHATSAPP_SENT = "WHATSAPP_SENT";
    public static final String WHATSAPP_FAILED = "WHATSAPP_FAILED";

    private AuditActions() {
    }
}
