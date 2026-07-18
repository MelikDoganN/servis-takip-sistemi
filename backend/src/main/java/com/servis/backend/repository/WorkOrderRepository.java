package com.servis.backend.repository;

import com.servis.backend.entity.WorkOrder;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface WorkOrderRepository extends JpaRepository<WorkOrder, Long> {
    List<WorkOrder> findByTechnicianId(Long technicianId);
    List<WorkOrder> findByCustomerId(Long customerId);
    List<WorkOrder> findByStatus(String status);
}