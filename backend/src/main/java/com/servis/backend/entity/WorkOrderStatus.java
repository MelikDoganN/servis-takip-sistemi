package com.servis.backend.entity;

public enum WorkOrderStatus {
    OPEN,
    ASSIGNED,
    IN_PROGRESS,
    WAITING_PARTS,
    RESOLVED,
    READY_FOR_DELIVERY,
    DELIVERED,
    CLOSED,
    CANCELLED
}
