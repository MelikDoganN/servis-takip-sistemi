package com.servis.backend.repository;

import com.servis.backend.entity.WorkOrder;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;

public interface WorkOrderRepository extends JpaRepository<WorkOrder, Long> {
    List<WorkOrder> findByTechnicianId(Long technicianId);
    List<WorkOrder> findByCustomerId(Long customerId);
    List<WorkOrder> findByStatus(String status);
    
    
    Page<WorkOrder> findByStatus(String status, Pageable pageable);
    List<WorkOrder> findByCreatedAtBetween(LocalDateTime start, LocalDateTime end);
    List<WorkOrder> findByDeviceId(Long deviceId);
    Page<WorkOrder> findByTechnicianId(Long technicianId, Pageable pageable);
}