package com.servis.backend.entity;

import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(
        name = "notification_dedup",
        uniqueConstraints = @UniqueConstraint(
                name = "uq_notification_dedup",
                columnNames = {"work_order_id", "event_type", "event_key"}
        )
)
public class NotificationDedup {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "work_order_id", nullable = false)
    private Long workOrderId;

    @Column(name = "event_type", nullable = false, length = 50)
    private String eventType;

    @Column(name = "event_key", nullable = false, length = 100)
    private String eventKey;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getWorkOrderId() {
        return workOrderId;
    }

    public void setWorkOrderId(Long workOrderId) {
        this.workOrderId = workOrderId;
    }

    public String getEventType() {
        return eventType;
    }

    public void setEventType(String eventType) {
        this.eventType = eventType;
    }

    public String getEventKey() {
        return eventKey;
    }

    public void setEventKey(String eventKey) {
        this.eventKey = eventKey;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
}
