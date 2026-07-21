package com.servis.backend.service;

import com.servis.backend.entity.*;
import com.servis.backend.repository.TechnicianRepository;
import com.servis.backend.repository.WorkOrderRepository;
import com.servis.backend.repository.WorkOrderStatusHistoryRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class WorkOrderService {

    @Autowired
    private WorkOrderRepository workOrderRepository;

    @Autowired
    private WorkOrderStatusHistoryRepository historyRepository;

    @Autowired
    private TechnicianRepository technicianRepository;

    // === LİSTELEME (Sayfalama Destekli) - 11. Gün ===
    public Page<WorkOrder> getAllWorkOrders(Pageable pageable) {
        return workOrderRepository.findAll(pageable);
    }

    public Page<WorkOrder> getWorkOrdersByStatus(String status, Pageable pageable) {
        return workOrderRepository.findByStatus(status, pageable);
    }

    // === LİSTELEME (Sayfalama Yok) ===
    public List<WorkOrder> getAllWorkOrders() {
        return workOrderRepository.findAll();
    }

    public WorkOrder getWorkOrderById(Long id) {
        return workOrderRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("İş emri bulunamadı: " + id));
    }

    // === İŞ EMRİ OLUŞTURMA ===
    @Transactional
    public WorkOrder createWorkOrder(WorkOrder workOrder) {
        workOrder.setStatus(WorkOrderStatus.OPEN.name());
        WorkOrder saved = workOrderRepository.save(workOrder);
        saveHistory(saved, null, WorkOrderStatus.OPEN.name(), "İş emri oluşturuldu", "WEB");
        return saved;
    }

    // === DURUM GÜNCELLEME (State Machine) ===
    @Transactional
    public WorkOrder updateStatus(Long workOrderId, String newStatus, User changedBy, String channel) {
        WorkOrder workOrder = getWorkOrderById(workOrderId);
        String oldStatus = workOrder.getStatus();

        validateTransition(oldStatus, newStatus);

        workOrder.setStatus(newStatus);
        switch (newStatus) {
            case "ASSIGNED" -> workOrder.setAssignedAt(LocalDateTime.now());
            case "WAITING_PARTS" -> workOrder.setWaitingForPartsSince(LocalDateTime.now());
            case "RESOLVED" -> workOrder.setCompletedAt(LocalDateTime.now());
            case "CLOSED" -> workOrder.setClosedAt(LocalDateTime.now());
        }

        WorkOrder updated = workOrderRepository.save(workOrder);
        saveHistory(updated, changedBy, newStatus, oldStatus + " → " + newStatus, channel);
        return updated;
    }

    // === TEKNİSYEN ATAMA ===
    @Transactional
    public WorkOrder assignTechnician(Long workOrderId, Long technicianId, User changedBy) {
        WorkOrder workOrder = getWorkOrderById(workOrderId);
        Technician technician = technicianRepository.findById(technicianId)
                .orElseThrow(() -> new RuntimeException("Teknisyen bulunamadı: " + technicianId));

        if (workOrder.getStatus().equals(WorkOrderStatus.CLOSED.name())) {
            throw new RuntimeException("Kapalı iş emrine teknisyen atanamaz");
        }

        workOrder.setTechnician(technician);
        workOrder.setStatus(WorkOrderStatus.ASSIGNED.name());
        workOrder.setAssignedAt(LocalDateTime.now());

        WorkOrder saved = workOrderRepository.save(workOrder);
        saveHistory(saved, changedBy, WorkOrderStatus.ASSIGNED.name(), "Teknisyen atandı: " + technician.getId(), "WEB");

        technician.setCurrentWorkload(technician.getCurrentWorkload() + 1);
        technicianRepository.save(technician);

        return saved;
    }

    // === DURUM GEÇİŞ KONTROLÜ (State Machine Kuralları) ===
    private void validateTransition(String oldStatus, String newStatus) {
        switch (oldStatus) {
            case "OPEN" -> {
                if (!newStatus.equals("ASSIGNED") && !newStatus.equals("CLOSED"))
                    throw new RuntimeException("OPEN → sadece ASSIGNED veya CLOSED");
            }
            case "ASSIGNED" -> {
                if (!newStatus.equals("WAITING_PARTS") && !newStatus.equals("RESOLVED"))
                    throw new RuntimeException("ASSIGNED → sadece WAITING_PARTS veya RESOLVED");
            }
            case "WAITING_PARTS" -> {
                if (!newStatus.equals("ASSIGNED") && !newStatus.equals("RESOLVED"))
                    throw new RuntimeException("WAITING_PARTS → sadece ASSIGNED veya RESOLVED");
            }
            case "RESOLVED" -> {
                if (!newStatus.equals("CLOSED"))
                    throw new RuntimeException("RESOLVED → sadece CLOSED");
            }
            case "CLOSED" -> throw new RuntimeException("Kapatılmış iş emri değiştirilemez");
            default -> throw new RuntimeException("Geçersiz durum: " + oldStatus);
        }
    }

    // === DURUM GEÇMİŞİ KAYDETME ===
    private void saveHistory(WorkOrder workOrder, User changedBy, String newStatus, String description, String channel) {
        WorkOrderStatusHistory history = new WorkOrderStatusHistory();
        history.setWorkOrder(workOrder);
        history.setChangedBy(changedBy);
        history.setOldStatus(workOrder.getStatus());
        history.setNewStatus(newStatus);
        history.setDescription(description);
        history.setChannel(channel);
        historyRepository.save(history);
    }

    // === KANBAN PANOSU (Duruma göre gruplama) - 12. Gün ===
    public Map<String, List<WorkOrder>> getKanbanGroupedByStatus() {
        List<WorkOrder> all = workOrderRepository.findAll();
        return all.stream().collect(Collectors.groupingBy(WorkOrder::getStatus));
    }
}