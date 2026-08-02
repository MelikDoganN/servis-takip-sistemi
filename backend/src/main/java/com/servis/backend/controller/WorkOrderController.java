package com.servis.backend.controller;

import com.servis.backend.dto.WorkOrderLifecycleUpdate;
import com.servis.backend.dto.WorkOrderTimelineEventDto;
import com.servis.backend.entity.Technician;
import com.servis.backend.entity.User;
import com.servis.backend.entity.WhatsAppOutbox;
import com.servis.backend.entity.WorkOrder;
import com.servis.backend.entity.WorkOrderAttachment;
import com.servis.backend.entity.WorkOrderStatusHistory;
import com.servis.backend.security.WorkOrderAccessGuard;
import com.servis.backend.service.CustomerService;
import com.servis.backend.service.PdfService;
import com.servis.backend.service.TechnicianService;
import com.servis.backend.service.WhatsAppOutboxService;
import com.servis.backend.service.WorkOrderAttachmentService;
import com.servis.backend.service.WorkOrderService;
import com.servis.backend.util.PhoneNormalizer;

import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.time.LocalDateTime;
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

    @Autowired
    private CustomerService customerService;

    @Autowired
    private WhatsAppOutboxService whatsAppOutboxService;

    @GetMapping
    public Page<WorkOrder> getAll(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String technicianWhatsapp,
            @RequestParam(required = false) String customerWhatsapp) {

        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));

        if (technicianWhatsapp != null && !technicianWhatsapp.isEmpty()) {
            try {
                Technician technician = technicianService.findByWhatsappNumber(technicianWhatsapp);
                return workOrderService.getWorkOrdersByTechnicianId(technician.getId(), pageable);
            } catch (RuntimeException e) {
                return Page.empty(pageable);
            }
        }

        if (customerWhatsapp != null && !customerWhatsapp.isEmpty()) {
            try {
                var customer = customerService.findByWhatsappNumber(customerWhatsapp);
                return workOrderService.getWorkOrdersByCustomerId(customer.getId(), pageable);
            } catch (RuntimeException e) {
                return Page.empty(pageable);
            }
        }

        if (status != null && !status.isEmpty()) {
            return workOrderService.getWorkOrdersByStatus(status, pageable);
        }
        return workOrderService.getAllWorkOrders(pageable);
    }

    @GetMapping("/by-service-number/{serviceNumber}")
    public ResponseEntity<?> getByServiceNumber(
            @PathVariable String serviceNumber,
            @RequestParam(required = false) String phone) {

        WorkOrder workOrder = workOrderService.getWorkOrderByServiceNumber(serviceNumber);

        if (phone != null && !phone.isEmpty()) {
            String whatsapp = workOrder.getCustomer().getWhatsappNumber();
            String customerPhone = workOrder.getCustomer().getPhone();
            boolean owns = PhoneNormalizer.matches(phone, whatsapp)
                    || PhoneNormalizer.matches(phone, customerPhone);
            if (!owns) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(Map.of("error", "Servis kaydı bulunamadı."));
            }
        }

        return ResponseEntity.ok(workOrder);
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getById(
            @PathVariable Long id,
            @RequestParam(required = false) String phone) {

        WorkOrder workOrder = workOrderService.getWorkOrderById(id);

        // Müşteri yetki kontrolü (sadece phone parametresi geldiyse)
        if (phone != null && !phone.isEmpty()) {
            String whatsapp = workOrder.getCustomer().getWhatsappNumber();
            String customerPhone = workOrder.getCustomer().getPhone();
            boolean owns = PhoneNormalizer.matches(phone, whatsapp)
                    || PhoneNormalizer.matches(phone, customerPhone);
            if (!owns) {
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
            @RequestParam(required = false) String technicianWhatsapp,
            @RequestParam(required = false) String cancellationReason,
            @RequestParam(required = false) String resolutionNote,
            @RequestParam(required = false) String deliveryNote,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime estimatedCompletionAt,
            @AuthenticationPrincipal UserDetails userDetails,
            Authentication authentication) {
        User currentUser = workOrderAccessGuard.requireCurrentUser(userDetails);
        WorkOrder existing = workOrderService.getWorkOrderById(id);
        if (technicianWhatsapp == null || technicianWhatsapp.isBlank()) {
            workOrderAccessGuard.assertCanModify(existing, authentication);
        }
        WorkOrderLifecycleUpdate lifecycle = new WorkOrderLifecycleUpdate();
        lifecycle.setCancellationReason(cancellationReason);
        lifecycle.setResolutionNote(resolutionNote);
        lifecycle.setDeliveryNote(deliveryNote);
        lifecycle.setEstimatedCompletionAt(estimatedCompletionAt);
        return ResponseEntity.ok(workOrderService.updateStatus(
                id, status, currentUser, channel, technicianWhatsapp, lifecycle));
    }

    @PutMapping("/{id}/lifecycle")
    public ResponseEntity<WorkOrder> updateLifecycle(
            @PathVariable Long id,
            @RequestBody WorkOrderLifecycleUpdate lifecycle,
            @AuthenticationPrincipal UserDetails userDetails,
            Authentication authentication) {
        User currentUser = workOrderAccessGuard.requireCurrentUser(userDetails);
        WorkOrder existing = workOrderService.getWorkOrderById(id);
        workOrderAccessGuard.assertCanModify(existing, authentication);
        return ResponseEntity.ok(workOrderService.updateLifecycleNotes(id, lifecycle, currentUser));
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

    @GetMapping("/{id}/timeline")
    public ResponseEntity<List<WorkOrderTimelineEventDto>> getTimeline(@PathVariable Long id) {
        return ResponseEntity.ok(workOrderService.getTimeline(id));
    }

    @GetMapping("/{id}/whatsapp-outbox")
    public ResponseEntity<List<WhatsAppOutbox>> listWhatsAppOutbox(
            @PathVariable Long id,
            Authentication authentication) {
        WorkOrder existing = workOrderService.getWorkOrderById(id);
        workOrderAccessGuard.assertCanModify(existing, authentication);
        return ResponseEntity.ok(whatsAppOutboxService.listByWorkOrder(id));
    }

    @PostMapping("/{id}/whatsapp-outbox/{outboxId}/retry")
    public ResponseEntity<?> retryWhatsAppOutbox(
            @PathVariable Long id,
            @PathVariable Long outboxId,
            Authentication authentication) {
        WorkOrder existing = workOrderService.getWorkOrderById(id);
        workOrderAccessGuard.assertCanModify(existing, authentication);
        WhatsAppOutbox existingOutbox = whatsAppOutboxService.listByWorkOrder(id).stream()
                .filter(o -> o.getId().equals(outboxId))
                .findFirst()
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Outbox kaydı bulunamadı"));
        try {
            return ResponseEntity.ok(whatsAppOutboxService.requeueForRetry(existingOutbox.getId()));
        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, e.getMessage());
        } catch (IllegalStateException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, e.getMessage());
        }
    }

    @PostMapping("/{id}/whatsapp/retry")
    public ResponseEntity<?> retryFailedWhatsApp(
            @PathVariable Long id,
            Authentication authentication) {
        WorkOrder existing = workOrderService.getWorkOrderById(id);
        workOrderAccessGuard.assertCanModify(existing, authentication);
        List<WhatsAppOutbox> requeued = whatsAppOutboxService.requeueFailedForWorkOrder(id);
        return ResponseEntity.ok(Map.of(
                "workOrderId", id,
                "requeuedCount", requeued.size(),
                "items", requeued
        ));
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