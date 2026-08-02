package com.servis.backend.repository;

import com.servis.backend.entity.WorkOrder;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface WorkOrderRepository extends JpaRepository<WorkOrder, Long> {
    List<WorkOrder> findByTechnicianId(Long technicianId);
    List<WorkOrder> findByCustomerId(Long customerId);
    List<WorkOrder> findByStatus(String status);
    
    
    Page<WorkOrder> findByStatus(String status, Pageable pageable);
    List<WorkOrder> findByCreatedAtBetween(LocalDateTime start, LocalDateTime end);
    List<WorkOrder> findByDeviceId(Long deviceId);
    Page<WorkOrder> findByTechnicianId(Long technicianId, Pageable pageable);

    Page<WorkOrder> findByCustomerId(Long customerId, Pageable pageable);

    boolean existsByDeviceId(Long deviceId);

    Optional<WorkOrder> findByServiceNumber(String serviceNumber);

    boolean existsByServiceNumber(String serviceNumber);

    @Query(value = "SELECT nextval('work_order_service_seq')", nativeQuery = true)
    Long nextServiceNumberSequence();

    long countByStatus(String status);

    long countByCreatedAtBetween(LocalDateTime start, LocalDateTime end);

    long countByResolvedAtBetween(LocalDateTime start, LocalDateTime end);

    long countByDeliveredAtBetween(LocalDateTime start, LocalDateTime end);

    @Query(value = "SELECT AVG(EXTRACT(EPOCH FROM (COALESCE(resolved_at, completed_at) - created_at)) / 3600.0) "
            + "FROM work_orders WHERE COALESCE(resolved_at, completed_at) IS NOT NULL",
            nativeQuery = true)
    Double averageResolutionHours();
}