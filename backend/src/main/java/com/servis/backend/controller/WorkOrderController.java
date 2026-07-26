package com.servis.backend.controller;

import com.servis.backend.entity.User;
import com.servis.backend.entity.WorkOrder;
import com.servis.backend.entity.WorkOrderAttachment;
import com.servis.backend.entity.WorkOrderStatusHistory;
import com.servis.backend.security.JwtService;
import com.servis.backend.service.PdfService;
import com.servis.backend.service.UserService;
import com.servis.backend.service.WorkOrderAttachmentService;
import com.servis.backend.service.WorkOrderService;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
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
    private UserService userService;

    @Autowired
    private WorkOrderAttachmentService attachmentService;

    @Autowired
    private PdfService pdfService;
   
    @Autowired
    private JwtService jwtService;
    // 1. LİSTELEME (Sayfalama + Filtreleme) - 11. Gün
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

    // 2. ID'YE GÖRE GETİR
    @GetMapping("/{id}")
    public ResponseEntity<WorkOrder> getById(@PathVariable Long id) {
        return ResponseEntity.ok(workOrderService.getWorkOrderById(id));
    }

    // 3. YENİ İŞ EMRİ OLUŞTUR (createdBy otomatik - 4. Adım)
    @PostMapping
    public ResponseEntity<WorkOrder> create(@Valid @RequestBody WorkOrder workOrder,
                                            @AuthenticationPrincipal UserDetails userDetails) {
        User currentUser = userService.findByEmail(userDetails.getUsername());
        workOrder.setCreatedBy(currentUser);
        return new ResponseEntity<>(workOrderService.createWorkOrder(workOrder), HttpStatus.CREATED);
    }

    // 4. DURUM GÜNCELLE (State Machine - 8. Gün)
    @PutMapping("/{id}/status")
    public ResponseEntity<WorkOrder> updateStatus(
            @PathVariable Long id,
            @RequestParam String status,
            @RequestParam(defaultValue = "WEB") String channel,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(workOrderService.updateStatus(id, status, null, channel));
    }

    // 5. TEKNİSYEN ATA (9. Gün)
    @PutMapping("/{id}/assign/{technicianId}")
    public ResponseEntity<WorkOrder> assignTechnician(
            @PathVariable Long id,
            @PathVariable Long technicianId,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(workOrderService.assignTechnician(id, technicianId, null));
    }

    // 6. KANBAN PANOSU (12. Gün)
    @GetMapping("/kanban")
    public Map<String, List<WorkOrder>> getKanban() {
        return workOrderService.getKanbanGroupedByStatus();
    }

    // 7. DURUM GEÇMİŞİ (13. Gün)
    @GetMapping("/{id}/history")
    public ResponseEntity<List<WorkOrderStatusHistory>> getHistory(@PathVariable Long id) {
        return ResponseEntity.ok(workOrderService.getStatusHistory(id));
    }

    // 8. FOTOĞRAF YÜKLE (14. Gün)
    @PostMapping("/{id}/upload")
    public ResponseEntity<WorkOrderAttachment> uploadFile(
            @PathVariable Long id,
            @RequestParam("file") MultipartFile file,
            @AuthenticationPrincipal UserDetails userDetails,
            HttpServletRequest request) throws IOException {

        User currentUser;
        if (userDetails != null) {
            currentUser = userService.findByEmail(userDetails.getUsername());
        } else {
            // Token'dan kullanıcıyı manuel çek
            String authHeader = request.getHeader("Authorization");
            if (authHeader == null || !authHeader.startsWith("Bearer ")) {
                throw new RuntimeException("Token bulunamadı veya geçersiz");
            }
            String token = authHeader.substring(7);
            String username = jwtService.extractUsername(token);
            currentUser = userService.findByEmail(username);
        }
        
        WorkOrderAttachment attachment = attachmentService.uploadFile(id, file, currentUser);
        return ResponseEntity.status(HttpStatus.CREATED).body(attachment);
    }

    // 9. İŞ EMRİNE AİT TÜM FOTOĞRAFLARI LİSTELE (14. Gün)
    @GetMapping("/{id}/attachments")
    public ResponseEntity<List<WorkOrderAttachment>> getAttachments(@PathVariable Long id) {
        return ResponseEntity.ok(attachmentService.getAttachmentsByWorkOrderId(id));
    }

    // 10. PDF ÇIKTISI OLUŞTUR (14. Gün)
    @GetMapping("/{id}/pdf")
    public ResponseEntity<byte[]> generatePdf(@PathVariable Long id) throws Exception {
        byte[] pdf = pdfService.generateWorkOrderPdf(id);
        return ResponseEntity.ok()
                .header("Content-Type", "application/pdf")
                .header("Content-Disposition", "attachment; filename=workorder_" + id + ".pdf")
                .body(pdf);
    }
}