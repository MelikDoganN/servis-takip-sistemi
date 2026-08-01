package com.servis.backend.controller;

import com.servis.backend.entity.Technician;
import com.servis.backend.entity.User;
import com.servis.backend.entity.WorkOrder;
import com.servis.backend.entity.WorkOrderAttachment;
import com.servis.backend.entity.WorkOrderStatusHistory;
import com.servis.backend.security.WorkOrderAccessGuard;
import com.servis.backend.service.PdfService;
import com.servis.backend.service.TechnicianService;
import com.servis.backend.service.WorkOrderAttachmentService;
import com.servis.backend.service.WorkOrderService;

import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/workorders")
public class WorkOrderController {

    @Autowired
    private WorkOrderService workOrderService;

    @Autowired
    private WorkOrderAttachmentService attachmentService;

    @Autowired
    private PdfService pdfService;

    @Autowired
    private WorkOrderAccessGuard workOrderAccessGuard;

    @Autowired
    private TechnicianService technicianService;

    @GetMapping
    public Page<WorkOrder> getAll(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String technicianWhatsapp) {

        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));

        if (technicianWhatsapp != null && !technicianWhatsapp.isEmpty()) {
            try {
                Technician technician = technicianService.findByWhatsappNumber(technicianWhatsapp);
                return workOrderService.getWorkOrdersByTechnicianId(technician.getId(), pageable);
            } catch (RuntimeException e) {
                return Page.empty(pageable);
            }
        }

        if (status != null && !status.isEmpty()) {
            return workOrderService.getWorkOrdersByStatus(status, pageable);
        }
        return workOrderService.getAllWorkOrders(pageable);
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getById(
            @PathVariable Long id,
            @RequestParam(required = false) String phone) {

        WorkOrder workOrder = workOrderService.getWorkOrderById(id);

        // Müşteri yetki kontrolü (sadece phone parametresi geldiyse)
        if (phone != null && !phone.isEmpty()) {
            String customerPhone = workOrder.getCustomer().getWhatsappNumber();
            if (customerPhone == null) {
                customerPhone = workOrder.getCustomer().getPhone();
            }
            if (!phone.equals(customerPhone)) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(Map.of("error", "Bu iş emrine erişim yetkiniz yok."));
            }
        }

        return ResponseEntity.ok(workOrder);
    }

    @PostMapping
    public ResponseEntity<WorkOrder> create(@Valid @RequestBody WorkOrder workOrder,
                                            @AuthenticationPrincipal UserDetails userDetails) {
        User currentUser = workOrderAccessGuard.requireCurrentUser(userDetails);
        workOrder.setCreatedBy(currentUser);
        return new ResponseEntity<>(workOrderService.createWorkOrder(workOrder), HttpStatus.CREATED);
    }

    @PutMapping("/{id}/status")
    public ResponseEntity<WorkOrder> updateStatus(
            @PathVariable Long id,
            @RequestParam String status,
            @RequestParam(defaultValue = "WEB") String channel,
            @AuthenticationPrincipal UserDetails userDetails,
            Authentication authentication) {
        User currentUser = workOrderAccessGuard.requireCurrentUser(userDetails);
        WorkOrder existing = workOrderService.getWorkOrderById(id);
        workOrderAccessGuard.assertCanModify(existing, authentication);
        return ResponseEntity.ok(workOrderService.updateStatus(id, status, currentUser, channel));
    }

    @PutMapping("/{id}/assign/{technicianId}")
    public ResponseEntity<WorkOrder> assignTechnician(
            @PathVariable Long id,
            @PathVariable Long technicianId,
            @AuthenticationPrincipal UserDetails userDetails,
            Authentication authentication) {
        User currentUser = workOrderAccessGuard.requireCurrentUser(userDetails);
        WorkOrder existing = workOrderService.getWorkOrderById(id);
        workOrderAccessGuard.assertCanModify(existing, authentication);
        return ResponseEntity.ok(workOrderService.assignTechnician(id, technicianId, currentUser));
    }

    @GetMapping("/kanban")
    public Map<String, List<WorkOrder>> getKanban() {
        return workOrderService.getKanbanGroupedByStatus();
    }

    @GetMapping("/{id}/history")
    public ResponseEntity<List<WorkOrderStatusHistory>> getHistory(@PathVariable Long id) {
        return ResponseEntity.ok(workOrderService.getStatusHistory(id));
    }

    @PostMapping("/{id}/upload")
    public ResponseEntity<WorkOrderAttachment> uploadFile(
            @PathVariable Long id,
            @RequestParam("file") MultipartFile file,
            @AuthenticationPrincipal UserDetails userDetails) throws IOException {
        User currentUser = workOrderAccessGuard.requireCurrentUser(userDetails);
        WorkOrderAttachment attachment = attachmentService.uploadFile(id, file, currentUser);
        return ResponseEntity.status(HttpStatus.CREATED).body(attachment);
    }

    @GetMapping("/{id}/attachments")
    public ResponseEntity<List<WorkOrderAttachment>> getAttachments(@PathVariable Long id) {
        return ResponseEntity.ok(attachmentService.getAttachmentsByWorkOrderId(id));
    }

    @GetMapping("/{id}/pdf")
    public ResponseEntity<byte[]> generatePdf(@PathVariable Long id) throws Exception {
        byte[] pdf = pdfService.generateWorkOrderPdf(id);
        return ResponseEntity.ok()
                .header("Content-Type", "application/pdf")
                .header("Content-Disposition", "attachment; filename=workorder_" + id + ".pdf")
                .body(pdf);
    }
}