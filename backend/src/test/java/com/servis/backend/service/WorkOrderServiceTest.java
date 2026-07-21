package com.servis.backend.service;

import com.servis.backend.entity.*;
import com.servis.backend.repository.TechnicianRepository;
import com.servis.backend.repository.WorkOrderRepository;
import com.servis.backend.repository.WorkOrderStatusHistoryRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class WorkOrderServiceTest {

    @Mock
    private WorkOrderRepository workOrderRepository;

    @Mock
    private WorkOrderStatusHistoryRepository historyRepository;

    @Mock
    private TechnicianRepository technicianRepository;

    @InjectMocks
    private WorkOrderService workOrderService;

    private WorkOrder workOrder;
    private Technician technician;

    @BeforeEach
    void setUp() {
        workOrder = new WorkOrder();
        workOrder.setId(1L);
        workOrder.setStatus("OPEN");

        technician = new Technician();
        technician.setId(1L);
        technician.setCurrentWorkload(0);
    }

    @Test
    void createWorkOrder_ShouldSetStatusOpen() {
        when(workOrderRepository.save(any(WorkOrder.class))).thenReturn(workOrder);

        WorkOrder created = workOrderService.createWorkOrder(workOrder);
        assertEquals("OPEN", created.getStatus());
    }

    @Test
    void updateStatus_FromOpenToAssigned_ShouldSucceed() {
        workOrder.setStatus("OPEN");
        when(workOrderRepository.findById(1L)).thenReturn(Optional.of(workOrder));
        when(workOrderRepository.save(any(WorkOrder.class))).thenReturn(workOrder);

        assertDoesNotThrow(() -> {
            WorkOrder updated = workOrderService.updateStatus(1L, "ASSIGNED", null, "WEB");
            assertEquals("ASSIGNED", updated.getStatus());
        });
    }

    @Test
    void updateStatus_FromOpenToClosed_ShouldSucceed() {
        workOrder.setStatus("OPEN");
        when(workOrderRepository.findById(1L)).thenReturn(Optional.of(workOrder));
        when(workOrderRepository.save(any(WorkOrder.class))).thenReturn(workOrder);

        assertDoesNotThrow(() -> {
            WorkOrder updated = workOrderService.updateStatus(1L, "CLOSED", null, "WEB");
            assertEquals("CLOSED", updated.getStatus());
        });
    }

    @Test
    void updateStatus_FromClosedToOpen_ShouldThrowException() {
        workOrder.setStatus("CLOSED");
        when(workOrderRepository.findById(1L)).thenReturn(Optional.of(workOrder));

        RuntimeException exception = assertThrows(RuntimeException.class, () -> {
            workOrderService.updateStatus(1L, "OPEN", null, "WEB");
        });
        assertEquals("Kapatılmış iş emri değiştirilemez", exception.getMessage());
    }

    @Test
    void assignTechnician_ShouldIncreaseWorkload() {
        workOrder.setStatus("OPEN");
        technician.setCurrentWorkload(2);

        when(workOrderRepository.findById(1L)).thenReturn(Optional.of(workOrder));
        when(technicianRepository.findById(1L)).thenReturn(Optional.of(technician));
        when(workOrderRepository.save(any(WorkOrder.class))).thenReturn(workOrder);

        WorkOrder updated = workOrderService.assignTechnician(1L, 1L, null);
        assertEquals("ASSIGNED", updated.getStatus());
        // Technician workload updated in service method (should be 3 now)
        assertEquals(3, technician.getCurrentWorkload());
    }
}