package com.servis.backend.service;

import com.servis.backend.entity.*;
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
    private Technician technician;
    private Customer customer;
    private Device device;
    private User createdBy;

    @BeforeEach
    void setUp() {
        createdBy = new User();
        createdBy.setId(99L);

        customer = new Customer();
        customer.setId(1L);
        customer.setFullName("Müşteri");

        device = new Device();
        device.setId(10L);
        device.setCustomer(customer);
        device.setSerialNumber("SN-1");

        workOrder = new WorkOrder();
        workOrder.setId(1L);
        workOrder.setStatus("OPEN");
        workOrder.setCustomer(customer);
        workOrder.setDevice(device);
        workOrder.setCreatedBy(createdBy);
        workOrder.setDescription("Arıza");
        workOrder.setPriority("MEDIUM");
        workOrder.setServiceType("PAID");

        technician = new Technician();
        technician.setId(1L);
        technician.setCurrentWorkload(0);
    }

    @Test
    void createWorkOrder_ShouldSetStatusOpen() {
        when(customerRepository.findById(1L)).thenReturn(Optional.of(customer));
        when(deviceRepository.findById(10L)).thenReturn(Optional.of(device));
        when(workOrderRepository.nextServiceNumberSequence()).thenReturn(17L);
        when(workOrderRepository.existsByServiceNumber(any())).thenReturn(false);
        when(workOrderRepository.save(any(WorkOrder.class))).thenAnswer(inv -> {
            WorkOrder wo = inv.getArgument(0);
            wo.setId(1L);
            return wo;
        });

        WorkOrder created = workOrderService.createWorkOrder(workOrder);
        assertEquals("OPEN", created.getStatus());
        assertEquals(customer, created.getCustomer());
        assertEquals(device, created.getDevice());
        assertNotNull(created.getServiceNumber());
        assertTrue(created.getServiceNumber().matches("SRV-\\d{4}-000017"));
    }

    @Test
    void createWorkOrder_DeviceNotOwnedByCustomer_ThrowsBadRequest() {
        Customer other = new Customer();
        other.setId(2L);
        device.setCustomer(other);

        when(customerRepository.findById(1L)).thenReturn(Optional.of(customer));
        when(deviceRepository.findById(10L)).thenReturn(Optional.of(device));

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> workOrderService.createWorkOrder(workOrder));
        assertEquals(400, ex.getStatusCode().value());
        assertTrue(ex.getReason().contains("ait değildir"));
    }

    @Test
    void createWorkOrder_MissingCustomer_ThrowsNotFound() {
        when(customerRepository.findById(1L)).thenReturn(Optional.empty());

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> workOrderService.createWorkOrder(workOrder));
        assertEquals(404, ex.getStatusCode().value());
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

        ResponseStatusException exception = assertThrows(ResponseStatusException.class, () -> {
            workOrderService.updateStatus(1L, "OPEN", null, "WEB");
        });
        assertEquals("Kapatılmış iş emri değiştirilemez", exception.getReason());
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
        assertEquals(3, technician.getCurrentWorkload());
    }
}
