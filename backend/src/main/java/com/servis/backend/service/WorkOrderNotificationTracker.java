package com.servis.backend.service;

import com.servis.backend.entity.WorkOrder;
import com.servis.backend.repository.WorkOrderRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

/**
 * İş emri üzerindeki son WhatsApp bildirim meta alanlarını günceller.
 */
@Service
public class WorkOrderNotificationTracker {

    private static final Logger log = LoggerFactory.getLogger(WorkOrderNotificationTracker.class);

    @Autowired
    private WorkOrderRepository workOrderRepository;

    @Transactional
    public void recordResult(Long workOrderId, String status, String messageId) {
        if (workOrderId == null || status == null) {
            return;
        }
        try {
            workOrderRepository.findById(workOrderId).ifPresent(wo -> apply(wo, status, messageId));
        } catch (Exception e) {
            log.warn("Bildirim meta güncellenemedi wo={}: {}", workOrderId, e.getClass().getSimpleName());
        }
    }

    private void apply(WorkOrder wo, String status, String messageId) {
        wo.setLastNotificationStatus(status);
        if ("SENT".equals(status)) {
            wo.setCustomerNotifiedAt(LocalDateTime.now());
            int current = wo.getCustomerNotificationCount() == null ? 0 : wo.getCustomerNotificationCount();
            wo.setCustomerNotificationCount(current + 1);
            if (messageId != null && !messageId.isBlank()) {
                wo.setLastWhatsappMessageId(messageId.length() <= 100 ? messageId : messageId.substring(0, 100));
            }
        } else if ("FAILED".equals(status) || "SKIPPED".equals(status)) {
            // sayacı artırmadan durum yaz
        }
        workOrderRepository.save(wo);
    }
}
