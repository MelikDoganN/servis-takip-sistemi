package com.servis.backend.dto;

import java.time.LocalDateTime;

/** Public servis sorgu — müşteri PII ve internal notlar içermez. */
public class PublicServiceStatusDto {

    private String serviceNumber;
    private String brand;
    private String model;
    private String status;
    private String technicianName;
    private LocalDateTime estimatedCompletionAt;
    private LocalDateTime updatedAt;

    public String getServiceNumber() {
        return serviceNumber;
    }

    public void setServiceNumber(String serviceNumber) {
        this.serviceNumber = serviceNumber;
    }

    public String getBrand() {
        return brand;
    }

    public void setBrand(String brand) {
        this.brand = brand;
    }

    public String getModel() {
        return model;
    }

    public void setModel(String model) {
        this.model = model;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getTechnicianName() {
        return technicianName;
    }

    public void setTechnicianName(String technicianName) {
        this.technicianName = technicianName;
    }

    public LocalDateTime getEstimatedCompletionAt() {
        return estimatedCompletionAt;
    }

    public void setEstimatedCompletionAt(LocalDateTime estimatedCompletionAt) {
        this.estimatedCompletionAt = estimatedCompletionAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }
}
