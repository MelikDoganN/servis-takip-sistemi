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
import com.servis.backend.repository.AttachmentRepository;
import com.servis.backend.repository.WorkOrderRepository;
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

    public byte[] generateWorkOrderPdf(Long workOrderId) throws Exception {
        WorkOrder workOrder = workOrderRepository.findById(workOrderId)
                .orElseThrow(() -> new RuntimeException("İş emri bulunamadı"));

        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        PdfWriter writer = new PdfWriter(baos);
        PdfDocument pdf = new PdfDocument(writer);
        Document document = new Document(pdf);

        // TÜRKÇE KARAKTER DESTEĞİ (En garanti yöntem)
        PdfFont font = PdfFontFactory.createFont("Helvetica", "Cp1254"); // Türkçe karakter desteği

        document.add(new Paragraph("İŞ EMRİ DETAYLARI").setFont(font).setBold().setFontSize(18));
        document.add(new Paragraph(" "));

        document.add(new Paragraph("ID: " + workOrder.getId()).setFont(font));
        document.add(new Paragraph("Müşteri: " + workOrder.getCustomer().getFullName()).setFont(font));
        document.add(new Paragraph("Cihaz Seri No: " + workOrder.getDevice().getSerialNumber()).setFont(font));
        document.add(new Paragraph("Açıklama: " + workOrder.getDescription()).setFont(font));
        document.add(new Paragraph("Durum: " + workOrder.getStatus()).setFont(font));
        document.add(new Paragraph("Öncelik: " + workOrder.getPriority()).setFont(font));
        document.add(new Paragraph("Oluşturma Tarihi: " + workOrder.getCreatedAt()).setFont(font));

        if (workOrder.getTechnician() != null) {
            document.add(new Paragraph("Teknisyen: " + workOrder.getTechnician().getUser().getFullName()).setFont(font));
        }

        // Fotoğrafları ekle (dosya yolu hatasını önlemek için)
        List<WorkOrderAttachment> attachments = attachmentRepository.findByWorkOrderId(workOrderId);
        if (!attachments.isEmpty()) {
            document.add(new Paragraph(" "));
            document.add(new Paragraph("--- EKLENEN FOTOĞRAFLAR ---").setFont(font).setBold());
            for (WorkOrderAttachment att : attachments) {
                if (att.getMimeType() != null && att.getMimeType().startsWith("image/")) {
                    try {
                        // Dosya yolunu düzelt (ters eğik çizgiyi normalleştir)
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
}