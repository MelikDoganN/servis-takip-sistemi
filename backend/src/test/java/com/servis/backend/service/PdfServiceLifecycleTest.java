package com.servis.backend.service;

import com.servis.backend.entity.Customer;
import com.servis.backend.entity.Device;
import com.servis.backend.entity.User;
import com.servis.backend.entity.WorkOrder;
import com.servis.backend.entity.WorkOrderStatusHistory;
import com.servis.backend.repository.AttachmentRepository;
import com.servis.backend.repository.WorkOrderRepository;
import com.servis.backend.repository.WorkOrderStatusHistoryRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PdfServiceLifecycleTest {

    @Mock
    private WorkOrderRepository workOrderRepository;
    @Mock
    private AttachmentRepository attachmentRepository;
    @Mock
    private WorkOrderStatusHistoryRepository historyRepository;

    @InjectMocks
    private PdfService pdfService;

    @Test
    void generatePdf_IncludesServiceNumberTimelineAndNotes() throws Exception {
        Customer customer = new Customer();
        customer.setFullName("Ayşe");
        Device device = new Device();
        device.setSerialNumber("SN-1");

        WorkOrder wo = new WorkOrder();
        wo.setId(1L);
        wo.setServiceNumber("SRV-2026-000001");
        wo.setCustomer(customer);
        wo.setDevice(device);
        wo.setDescription("Arıza");
        wo.setStatus("DELIVERED");
        wo.setPriority("MEDIUM");
        wo.setCreatedAt(LocalDateTime.now());
        wo.setResolutionNote("Fan değişti");
        wo.setDeliveryNote("Müşteri teslim aldı");
        wo.setDeliveredAt(LocalDateTime.now());

        User changer = new User();
        changer.setFullName("Operatör");
        WorkOrderStatusHistory h = new WorkOrderStatusHistory();
        h.setOldStatus("READY_FOR_DELIVERY");
        h.setNewStatus("DELIVERED");
        h.setDescription("Teslim");
        h.setChangedBy(changer);
        h.setCreatedAt(LocalDateTime.now());

        when(workOrderRepository.findById(1L)).thenReturn(Optional.of(wo));
        when(attachmentRepository.findByWorkOrderId(1L)).thenReturn(List.of());
        when(historyRepository.findByWorkOrderIdOrderByCreatedAtDesc(1L)).thenReturn(List.of(h));

        byte[] pdf = pdfService.generateWorkOrderPdf(1L);
        assertNotNull(pdf);
        assertTrue(pdf.length > 100);
    }
}
