package com.servis.backend.service;

import com.servis.backend.entity.User;
import com.servis.backend.entity.WorkOrder;
import com.servis.backend.entity.WorkOrderAttachment;
import com.servis.backend.repository.AttachmentRepository;
import com.servis.backend.repository.WorkOrderRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.List;
import java.util.UUID;

@Service
public class WorkOrderAttachmentService {

    @Autowired
    private AttachmentRepository attachmentRepository;

    @Autowired
    private WorkOrderRepository workOrderRepository;

    @Autowired
    private ActivityLogService activityLogService;

    private final String uploadDir = "uploads/";

    public WorkOrderAttachment uploadFile(Long workOrderId, MultipartFile file, User uploadedBy) throws IOException {
        // 1. İş emrini kontrol et
        WorkOrder workOrder = workOrderRepository.findById(workOrderId)
                .orElseThrow(() -> new RuntimeException("İş emri bulunamadı: " + workOrderId));

        // 2. Klasörü oluştur (uploads/{workOrderId}/)
        Path uploadPath = Paths.get(uploadDir + workOrderId);
        if (!Files.exists(uploadPath)) {
            Files.createDirectories(uploadPath);
        }

        // 3. Benzersiz dosya adı oluştur
        String originalFileName = file.getOriginalFilename();
        String extension = "";
        if (originalFileName != null && originalFileName.contains(".")) {
            extension = originalFileName.substring(originalFileName.lastIndexOf("."));
        }
        String newFileName = UUID.randomUUID().toString() + extension;

        // 4. Dosyayı kaydet
        Path filePath = uploadPath.resolve(newFileName);
        Files.copy(file.getInputStream(), filePath, StandardCopyOption.REPLACE_EXISTING);

        // 5. Attachment kaydı oluştur
        WorkOrderAttachment attachment = new WorkOrderAttachment();
        attachment.setWorkOrder(workOrder);
        attachment.setFileName(originalFileName);
        attachment.setFilePath(filePath.toString());
        attachment.setFileSize(file.getSize());
        attachment.setMimeType(file.getContentType());
        attachment.setUploadedBy(uploadedBy);

        WorkOrderAttachment saved = attachmentRepository.save(attachment);

        // 6. ActivityLog'a kaydet
        activityLogService.log(
        	    "TEKNISYEN_FOTO_YUKLEDI",
        	    "WorkOrderAttachment",
        	    saved.getId(),
        	    uploadedBy,   // <-- User nesnesini gönder
        	    "WEB",
        	    null
        	);

        return saved;
    }

    public List<WorkOrderAttachment> getAttachmentsByWorkOrderId(Long workOrderId) {
        return attachmentRepository.findByWorkOrderId(workOrderId);
    }

    public byte[] getFileContent(Long attachmentId) throws IOException {
        WorkOrderAttachment attachment = attachmentRepository.findById(attachmentId)
                .orElseThrow(() -> new RuntimeException("Dosya bulunamadı: " + attachmentId));
        Path filePath = Paths.get(attachment.getFilePath());
        return Files.readAllBytes(filePath);
    }
}