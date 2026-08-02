package com.servis.backend.service;

import com.servis.backend.entity.WorkOrder;
import com.servis.backend.entity.WorkOrderStatus;
import com.servis.backend.repository.CustomerRepository;
import com.servis.backend.repository.DeviceRepository;
import com.servis.backend.repository.RegionRepository;
import com.servis.backend.repository.TechnicianRepository;
import com.servis.backend.repository.WorkOrderRepository;
import com.servis.backend.repository.WorkOrderStatusHistoryRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.server.ResponseStatusException;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class WorkOrderStateMachineTest {

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

    @BeforeEach
    void setUp() {
        workOrder = new WorkOrder();
        workOrder.setId(1L);
        workOrder.setStatus(WorkOrderStatus.OPEN.name());
    }

    @Test
    void openToAssigned_Ok() {
        when(workOrderRepository.findById(1L)).thenReturn(Optional.of(workOrder));
        when(workOrderRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        WorkOrder updated = workOrderService.updateStatus(1L, "ASSIGNED", null, "WEB");
        assertEquals("ASSIGNED", updated.getStatus());
        verify(historyRepository).save(any());
        verify(notificationService).notifyStatusChanged(any(), eq("ASSIGNED"));
    }

    @Test
    void assignedToInProgress_Ok() {
        workOrder.setStatus("ASSIGNED");
        when(workOrderRepository.findById(1L)).thenReturn(Optional.of(workOrder));
        when(workOrderRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        assertEquals("IN_PROGRESS",
                workOrderService.updateStatus(1L, "IN_PROGRESS", null, "WEB").getStatus());
    }

    @Test
    void assignedToResolved_Forbidden() {
        workOrder.setStatus("ASSIGNED");
        when(workOrderRepository.findById(1L)).thenReturn(Optional.of(workOrder));
        assertThrows(ResponseStatusException.class,
                () -> workOrderService.updateStatus(1L, "RESOLVED", null, "WEB"));
    }

    @Test
    void cancelFromAssigned_Ok() {
        workOrder.setStatus("ASSIGNED");
        when(workOrderRepository.findById(1L)).thenReturn(Optional.of(workOrder));
        when(workOrderRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        assertEquals("CANCELLED",
                workOrderService.updateStatus(1L, "CANCELLED", null, "WEB").getStatus());
    }

    @Test
    void cancelledIsTerminal() {
        workOrder.setStatus("CANCELLED");
        when(workOrderRepository.findById(1L)).thenReturn(Optional.of(workOrder));
        assertThrows(ResponseStatusException.class,
                () -> workOrderService.updateStatus(1L, "OPEN", null, "WEB"));
    }

    @Test
    void closedIsTerminal() {
        workOrder.setStatus("CLOSED");
        when(workOrderRepository.findById(1L)).thenReturn(Optional.of(workOrder));
        assertThrows(ResponseStatusException.class,
                () -> workOrderService.updateStatus(1L, "OPEN", null, "WEB"));
    }
}
