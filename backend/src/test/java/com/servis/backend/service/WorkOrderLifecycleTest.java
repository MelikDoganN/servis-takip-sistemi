package com.servis.backend.service;

import com.servis.backend.dto.WorkOrderLifecycleUpdate;
import com.servis.backend.dto.WorkOrderTimelineEventDto;
import com.servis.backend.entity.User;
import com.servis.backend.entity.WorkOrder;
import com.servis.backend.entity.WorkOrderStatusHistory;
import com.servis.backend.repository.CustomerRepository;
import com.servis.backend.repository.DeviceRepository;
import com.servis.backend.repository.RegionRepository;
import com.servis.backend.repository.TechnicianRepository;
import com.servis.backend.repository.WorkOrderRepository;
import com.servis.backend.repository.WorkOrderStatusHistoryRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class WorkOrderLifecycleTest {

    @Mock
    private WorkOrderRepository workOrderRepository;
    @Mock
    private WorkOrderStatusHistoryRepository historyRepository;
    @Mock
    private TechnicianRepository technicianRepository;
    @Mock
    private CustomerRepository customerRepository;
    @Mock
    private DeviceRepository deviceRepository;
    @Mock
    private RegionRepository regionRepository;
    @Mock
    private WhatsAppNotificationClient whatsAppNotificationClient;
    @Mock
    private NotificationService notificationService;

    @InjectMocks
    private WorkOrderService workOrderService;

    private WorkOrder workOrder;
    private User user;

    @BeforeEach
    void setUp() {
        user = new User();
        user.setId(1L);
        user.setFullName("Admin");

        workOrder = new WorkOrder();
        workOrder.setId(10L);
        workOrder.setServiceNumber("SRV-2026-000010");
        workOrder.setStatus("OPEN");
    }

    @Test
    void fullHappyPath_OpenToClosed() {
        when(workOrderRepository.findById(10L)).thenReturn(Optional.of(workOrder));
        when(workOrderRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        assertEquals("ASSIGNED",
                workOrderService.updateStatus(10L, "ASSIGNED", user, "WEB").getStatus());
        assertEquals("IN_PROGRESS",
                workOrderService.updateStatus(10L, "IN_PROGRESS", user, "WEB").getStatus());
        assertEquals("RESOLVED",
                workOrderService.updateStatus(10L, "RESOLVED", user, "WEB").getStatus());
        assertNotNull(workOrder.getResolvedAt());
        assertEquals("READY_FOR_DELIVERY",
                workOrderService.updateStatus(10L, "READY_FOR_DELIVERY", user, "WEB").getStatus());
        assertEquals("DELIVERED",
                workOrderService.updateStatus(10L, "DELIVERED", user, "WEB").getStatus());
        assertNotNull(workOrder.getDeliveredAt());
        assertEquals("CLOSED",
                workOrderService.updateStatus(10L, "CLOSED", user, "WEB").getStatus());
    }

    @Test
    void cancelFromInProgress_WithReason() {
        workOrder.setStatus("IN_PROGRESS");
        when(workOrderRepository.findById(10L)).thenReturn(Optional.of(workOrder));
        when(workOrderRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        WorkOrderLifecycleUpdate lifecycle = new WorkOrderLifecycleUpdate();
        lifecycle.setCancellationReason("Müşteri vazgeçti");

        WorkOrder updated = workOrderService.updateStatus(
                10L, "CANCELLED", user, "WEB", null, lifecycle);
        assertEquals("CANCELLED", updated.getStatus());
        assertEquals("Müşteri vazgeçti", updated.getCancellationReason());

        ArgumentCaptor<WorkOrderStatusHistory> hist = ArgumentCaptor.forClass(WorkOrderStatusHistory.class);
        verify(historyRepository).save(hist.capture());
        assertTrue(hist.getValue().getDescription().contains("İptal"));
    }

    @Test
    void resolvedToClosed_Forbidden_MustGoThroughDelivery() {
        workOrder.setStatus("RESOLVED");
        when(workOrderRepository.findById(10L)).thenReturn(Optional.of(workOrder));
        assertThrows(ResponseStatusException.class,
                () -> workOrderService.updateStatus(10L, "CLOSED", user, "WEB"));
    }

    @Test
    void timeline_MapsChangedBy() {
        when(workOrderRepository.findById(10L)).thenReturn(Optional.of(workOrder));
        WorkOrderStatusHistory h = new WorkOrderStatusHistory();
        h.setId(5L);
        h.setOldStatus("OPEN");
        h.setNewStatus("ASSIGNED");
        h.setDescription("OPEN → ASSIGNED");
        h.setChannel("WEB");
        h.setChangedBy(user);
        when(historyRepository.findByWorkOrderIdOrderByCreatedAtDesc(10L)).thenReturn(List.of(h));

        List<WorkOrderTimelineEventDto> timeline = workOrderService.getTimeline(10L);
        assertEquals(1, timeline.size());
        assertEquals("Admin", timeline.get(0).getChangedByName());
        assertEquals("ASSIGNED", timeline.get(0).getNewStatus());
    }

    @Test
    void statusChangeMessage_IncludesServiceNumberForLifecycleEvents() {
        assertTrue(WorkOrderService.statusChangeMessage("SRV-1", "IN_PROGRESS").contains("SRV-1"));
        assertTrue(WorkOrderService.statusChangeMessage("SRV-1", "IN_PROGRESS").contains("işlem başladı"));
        assertTrue(WorkOrderService.statusChangeMessage("SRV-1", "READY_FOR_DELIVERY").contains("teslime hazır"));
        assertTrue(WorkOrderService.statusChangeMessage("SRV-1", "DELIVERED").contains("teslim edildi"));
        assertTrue(WorkOrderService.statusChangeMessage("SRV-1", "RESOLVED").contains("tamamlandı"));
    }
}
