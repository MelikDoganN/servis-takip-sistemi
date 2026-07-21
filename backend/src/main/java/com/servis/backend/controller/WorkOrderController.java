package com.servis.backend.controller;

import com.servis.backend.entity.WorkOrder;
import com.servis.backend.service.WorkOrderService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/workorders")
public class WorkOrderController {

    @Autowired
    private WorkOrderService workOrderService;

    // === LİSTELEME (Sayfalama + Filtreleme) ===
    @GetMapping
    public Page<WorkOrder> getAll(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) String status) {

        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));

        if (status != null && !status.isEmpty()) {
            return workOrderService.getWorkOrdersByStatus(status, pageable);
        }
        return workOrderService.getAllWorkOrders(pageable);
    }

    // === ID'YE GÖRE GETİR ===
    @GetMapping("/{id}")
    public ResponseEntity<WorkOrder> getById(@PathVariable Long id) {
        return ResponseEntity.ok(workOrderService.getWorkOrderById(id));
    }

    // === YENİ İŞ EMRİ OLUŞTUR ===
    @PostMapping
    public ResponseEntity<WorkOrder> create(@RequestBody WorkOrder workOrder) {
        return new ResponseEntity<>(workOrderService.createWorkOrder(workOrder), HttpStatus.CREATED);
    }

    // === DURUM GÜNCELLE (State Machine) ===
    @PutMapping("/{id}/status")
    public ResponseEntity<WorkOrder> updateStatus(
            @PathVariable Long id,
            @RequestParam String status,
            @RequestParam(defaultValue = "WEB") String channel,
            @AuthenticationPrincipal UserDetails userDetails) {
        // userDetails'ten User entity'sine çevirme işlemi sonra yapılacak, şimdilik null
        return ResponseEntity.ok(workOrderService.updateStatus(id, status, null, channel));
    }

    // === TEKNİSYEN ATA ===
    @PutMapping("/{id}/assign/{technicianId}")
    public ResponseEntity<WorkOrder> assignTechnician(
            @PathVariable Long id,
            @PathVariable Long technicianId,
            @AuthenticationPrincipal UserDetails userDetails) {
        // changedBy kullanıcısı şimdilik null geçilebilir, ileride doldurulur
        return ResponseEntity.ok(workOrderService.assignTechnician(id, technicianId, null));
    }
}