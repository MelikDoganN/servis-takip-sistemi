package com.servis.backend.dto;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

public class WarrantyDeviceInfoDto {

    private String deviceName;
    private String brand;
    private String model;
    private String customerName;
    private String serialNumber;
    private LocalDate warrantyStart;
    private LocalDate warrantyEnd;
    private String warrantyStatus;
    private List<ServiceHistorySummary> serviceHistory;

    public String getDeviceName() {
        return deviceName;
    }

    public void setDeviceName(String deviceName) {
        this.deviceName = deviceName;
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

    public String getCustomerName() {
        return customerName;
    }

    public void setCustomerName(String customerName) {
        this.customerName = customerName;
    }

    public String getSerialNumber() {
        return serialNumber;
    }

    public void setSerialNumber(String serialNumber) {
        this.serialNumber = serialNumber;
    }

    public LocalDate getWarrantyStart() {
        return warrantyStart;
    }

    public void setWarrantyStart(LocalDate warrantyStart) {
        this.warrantyStart = warrantyStart;
    }

    public LocalDate getWarrantyEnd() {
        return warrantyEnd;
    }

    public void setWarrantyEnd(LocalDate warrantyEnd) {
        this.warrantyEnd = warrantyEnd;
    }

    public String getWarrantyStatus() {
        return warrantyStatus;
    }

    public void setWarrantyStatus(String warrantyStatus) {
        this.warrantyStatus = warrantyStatus;
    }

    public List<ServiceHistorySummary> getServiceHistory() {
        return serviceHistory;
    }

    public void setServiceHistory(List<ServiceHistorySummary> serviceHistory) {
        this.serviceHistory = serviceHistory;
    }

    public static class ServiceHistorySummary {
        private Long workOrderId;
        private String status;
        private String description;
        private LocalDateTime createdAt;

        public Long getWorkOrderId() {
            return workOrderId;
        }

        public void setWorkOrderId(Long workOrderId) {
            this.workOrderId = workOrderId;
        }

        public String getStatus() {
            return status;
        }

        public void setStatus(String status) {
            this.status = status;
        }

        public String getDescription() {
            return description;
        }

        public void setDescription(String description) {
            this.description = description;
        }

        public LocalDateTime getCreatedAt() {
            return createdAt;
        }

        public void setCreatedAt(LocalDateTime createdAt) {
            this.createdAt = createdAt;
        }
    }
}
