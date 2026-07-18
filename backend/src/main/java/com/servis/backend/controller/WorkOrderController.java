package com.servis.backend.controller;

import com.servis.backend.entity.WorkOrder;
import com.servis.backend.service.WorkOrderService;
import org.springframework.beans.factory.annotation.Autowired;
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

    @GetMapping
    public List<WorkOrder> getAll() {
        return workOrderService.getAllWorkOrders();
    }

    @GetMapping("/{id}")
    public ResponseEntity<WorkOrder> getById(@PathVariable Long id) {
        return ResponseEntity.ok(workOrderService.getWorkOrderById(id));
    }

    @PostMapping
    public ResponseEntity<WorkOrder> create(@RequestBody WorkOrder workOrder) {
        return new ResponseEntity<>(workOrderService.createWorkOrder(workOrder), HttpStatus.CREATED);
    }

    @PutMapping("/{id}/status")
    public ResponseEntity<WorkOrder> updateStatus(
            @PathVariable Long id,
            @RequestParam String status,
            @RequestParam(defaultValue = "WEB") String channel,
            @AuthenticationPrincipal UserDetails userDetails) {
        // userDetails'ten User entity'sine çevirme işlemi sonra yapılacak, şimdilik null
        return ResponseEntity.ok(workOrderService.updateStatus(id, status, null, channel));
    }
}