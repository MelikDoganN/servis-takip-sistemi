package com.servis.backend.dto;

import java.time.LocalDateTime;

/**
 * Opsiyonel yaşam döngüsü alanları (status güncellemesi ile birlikte).
 */
public class WorkOrderLifecycleUpdate {

    private String cancellationReason;
    private String resolutionNote;
    private String deliveryNote;
    private LocalDateTime estimatedCompletionAt;

    public String getCancellationReason() {
        return cancellationReason;
    }

    public void setCancellationReason(String cancellationReason) {
        this.cancellationReason = cancellationReason;
    }

    public String getResolutionNote() {
        return resolutionNote;
    }

    public void setResolutionNote(String resolutionNote) {
        this.resolutionNote = resolutionNote;
    }

    public String getDeliveryNote() {
        return deliveryNote;
    }

    public void setDeliveryNote(String deliveryNote) {
        this.deliveryNote = deliveryNote;
    }

    public LocalDateTime getEstimatedCompletionAt() {
        return estimatedCompletionAt;
    }

    public void setEstimatedCompletionAt(LocalDateTime estimatedCompletionAt) {
        this.estimatedCompletionAt = estimatedCompletionAt;
    }
}
