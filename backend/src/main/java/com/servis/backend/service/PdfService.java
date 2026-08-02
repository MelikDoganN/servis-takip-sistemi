package com.servis.backend.service;

import com.itextpdf.io.image.ImageDataFactory;
import com.itextpdf.kernel.font.PdfFont;
import com.itextpdf.kernel.font.PdfFontFactory;
import com.itextpdf.kernel.pdf.PdfDocument;
import com.itextpdf.kernel.pdf.PdfWriter;
import com.itextpdf.layout.Document;
import com.itextpdf.layout.element.Image;
import com.itextpdf.layout.element.Paragraph;
import com.servis.backend.entity.WorkOrder;
import com.servis.backend.entity.WorkOrderAttachment;
import com.servis.backend.entity.WorkOrderStatusHistory;
import com.servis.backend.repository.AttachmentRepository;
import com.servis.backend.repository.WorkOrderRepository;
import com.servis.backend.repository.WorkOrderStatusHistoryRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.util.List;

@Service
public class PdfService {

    @Autowired
    private WorkOrderRepository workOrderRepository;

    @Autowired
    private AttachmentRepository attachmentRepository;

    @Autowired
    private WorkOrderStatusHistoryRepository historyRepository;

    public byte[] generateWorkOrderPdf(Long workOrderId) throws Exception {
        WorkOrder workOrder = workOrderRepository.findById(workOrderId)
                .orElseThrow(() -> new RuntimeException("İş emri bulunamadı"));

        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        PdfWriter writer = new PdfWriter(baos);
        PdfDocument pdf = new PdfDocument(writer);
        Document document = new Document(pdf);

        PdfFont font = PdfFontFactory.createFont("Helvetica", "Cp1254");

        String serviceNo = workOrder.getServiceNumber() != null ? workOrder.getServiceNumber() : "";
        document.add(new Paragraph("SERVİS KAYDI " + serviceNo).setFont(font).setFontSize(18));
        document.add(new Paragraph(" "));

        document.add(new Paragraph("Servis No: " + (serviceNo.isBlank() ? "-" : serviceNo)).setFont(font));
        document.add(new Paragraph("Müşteri: " + workOrder.getCustomer().getFullName()).setFont(font));
        document.add(new Paragraph("Cihaz Seri No: " + workOrder.getDevice().getSerialNumber()).setFont(font));
        document.add(new Paragraph("Açıklama: " + nullSafe(workOrder.getDescription())).setFont(font));
        document.add(new Paragraph("Durum: " + WorkOrderService.statusLabelTr(workOrder.getStatus())).setFont(font));
        document.add(new Paragraph("Öncelik: " + nullSafe(workOrder.getPriority())).setFont(font));
        document.add(new Paragraph("Oluşturma Tarihi: " + String.valueOf(workOrder.getCreatedAt())).setFont(font));
        if (workOrder.getEstimatedCompletionAt() != null) {
            document.add(new Paragraph("Tahmini Teslim: " + workOrder.getEstimatedCompletionAt()).setFont(font));
        }

        if (workOrder.getTechnician() != null && workOrder.getTechnician().getUser() != null) {
            document.add(new Paragraph("Teknisyen: " + workOrder.getTechnician().getUser().getFullName()).setFont(font));
        }

        document.add(new Paragraph(" "));
        document.add(new Paragraph("--- ÇÖZÜM NOTU ---").setFont(font));
        document.add(new Paragraph(nullSafe(workOrder.getResolutionNote(), "Belirtilmemiş")).setFont(font));

        document.add(new Paragraph(" "));
        document.add(new Paragraph("--- TESLİM BİLGİSİ ---").setFont(font));
        document.add(new Paragraph("Teslim tarihi: "
                + (workOrder.getDeliveredAt() != null ? workOrder.getDeliveredAt().toString() : "—")).setFont(font));
        document.add(new Paragraph("Teslim notu: "
                + nullSafe(workOrder.getDeliveryNote(), "Belirtilmemiş")).setFont(font));
        if (workOrder.getCancellationReason() != null && !workOrder.getCancellationReason().isBlank()) {
            document.add(new Paragraph("İptal nedeni: " + workOrder.getCancellationReason()).setFont(font));
        }

        document.add(new Paragraph(" "));
        document.add(new Paragraph("--- TIMELINE ---").setFont(font));
        List<WorkOrderStatusHistory> timeline =
                historyRepository.findByWorkOrderIdOrderByCreatedAtDesc(workOrderId);
        if (timeline.isEmpty()) {
            document.add(new Paragraph("Kayıt yok").setFont(font));
        } else {
            for (WorkOrderStatusHistory h : timeline) {
                String who = h.getChangedBy() != null && h.getChangedBy().getFullName() != null
                        ? h.getChangedBy().getFullName()
                        : "Sistem";
                String line = h.getCreatedAt() + " | " + who + " | "
                        + nullSafe(h.getOldStatus(), "-") + " → " + h.getNewStatus()
                        + (h.getDescription() != null ? " | " + h.getDescription() : "");
                document.add(new Paragraph(line).setFont(font).setFontSize(9));
            }
        }

        List<WorkOrderAttachment> attachments = attachmentRepository.findByWorkOrderId(workOrderId);
        if (!attachments.isEmpty()) {
            document.add(new Paragraph(" "));
            document.add(new Paragraph("--- EKLENEN FOTOĞRAFLAR ---").setFont(font));
            for (WorkOrderAttachment att : attachments) {
                if (att.getMimeType() != null && att.getMimeType().startsWith("image/")) {
                    try {
                        String filePath = att.getFilePath().replace("\\", "/");
                        byte[] imageBytes = Files.readAllBytes(Paths.get(filePath));
                        Image img = new Image(ImageDataFactory.create(imageBytes));
                        img.setWidth(150);
                        img.setHeight(150);
                        document.add(img);
                    } catch (Exception e) {
                        document.add(new Paragraph("Fotoğraf yüklenemedi: " + att.getFileName()).setFont(font));
                    }
                }
            }
        }

        document.close();
        return baos.toByteArray();
    }

    private static String nullSafe(String value) {
        return value == null ? "-" : value;
    }

    private static String nullSafe(String value, String fallback) {
        return value == null || value.isBlank() ? fallback : value;
    }
}
