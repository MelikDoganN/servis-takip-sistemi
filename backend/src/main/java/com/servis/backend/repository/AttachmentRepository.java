package com.servis.backend.repository;

import com.servis.backend.entity.WorkOrderAttachment;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface AttachmentRepository extends JpaRepository<WorkOrderAttachment, Long> {
    List<WorkOrderAttachment> findByWorkOrderId(Long workOrderId);
}