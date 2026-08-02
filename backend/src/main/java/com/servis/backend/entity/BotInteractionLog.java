package com.servis.backend.entity;

import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "bot_interaction_logs")
public class BotInteractionLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "technician_id")
    private Long technicianId;

    @Column(name = "customer_id")
    private Long customerId;

    @Column(name = "phone_number", nullable = false, length = 20)
    private String phoneNumber;

    @Column(name = "message_type", nullable = false, length = 30)
    private String messageType;

    @Column(name = "incoming_message", columnDefinition = "TEXT")
    private String incomingMessage;

    @Column(name = "outgoing_message", columnDefinition = "TEXT")
    private String outgoingMessage;

    @Column(name = "command", length = 100)
    private String command;

    @Column(name = "status", nullable = false, length = 30)
    private String status;

    @Column(name = "direction", length = 20)
    private String direction;

    @Column(name = "event_type", length = 50)
    private String eventType;

    @Column(name = "external_message_id", length = 100, unique = true)
    private String externalMessageId;

    @Column(name = "work_order_id")
    private Long workOrderId;

    @Column(name = "error_message", length = 255)
    private String errorMessage;

    @Column(name = "message_summary", length = 255)
    private String messageSummary;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getTechnicianId() {
        return technicianId;
    }

    public void setTechnicianId(Long technicianId) {
        this.technicianId = technicianId;
    }

    public Long getCustomerId() {
        return customerId;
    }

    public void setCustomerId(Long customerId) {
        this.customerId = customerId;
    }

    public String getPhoneNumber() {
        return phoneNumber;
    }

    public void setPhoneNumber(String phoneNumber) {
        this.phoneNumber = phoneNumber;
    }

    public String getMessageType() {
        return messageType;
    }

    public void setMessageType(String messageType) {
        this.messageType = messageType;
    }

    public String getIncomingMessage() {
        return incomingMessage;
    }

    public void setIncomingMessage(String incomingMessage) {
        this.incomingMessage = incomingMessage;
    }

    public String getOutgoingMessage() {
        return outgoingMessage;
    }

    public void setOutgoingMessage(String outgoingMessage) {
        this.outgoingMessage = outgoingMessage;
    }

    public String getCommand() {
        return command;
    }

    public void setCommand(String command) {
        this.command = command;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getDirection() {
        return direction;
    }

    public void setDirection(String direction) {
        this.direction = direction;
    }

    public String getEventType() {
        return eventType;
    }

    public void setEventType(String eventType) {
        this.eventType = eventType;
    }

    public String getExternalMessageId() {
        return externalMessageId;
    }

    public void setExternalMessageId(String externalMessageId) {
        this.externalMessageId = externalMessageId;
    }

    public Long getWorkOrderId() {
        return workOrderId;
    }

    public void setWorkOrderId(Long workOrderId) {
        this.workOrderId = workOrderId;
    }

    public String getErrorMessage() {
        return errorMessage;
    }

    public void setErrorMessage(String errorMessage) {
        this.errorMessage = errorMessage;
    }

    public String getMessageSummary() {
        return messageSummary;
    }

    public void setMessageSummary(String messageSummary) {
        this.messageSummary = messageSummary;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
}
