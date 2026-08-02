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

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class WorkOrderWhatsAppNotifyTest {

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

    @InjectMocks
    private WorkOrderService workOrderService;

    private WorkOrder workOrder;
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
        customer.setWhatsappNumber("905551112233");

        device = new Device();
        device.setId(10L);
        device.setCustomer(customer);
        device.setSerialNumber("SN-NOTIFY");

        workOrder = new WorkOrder();
        workOrder.setCustomer(customer);
        workOrder.setDevice(device);
        workOrder.setCreatedBy(createdBy);
        workOrder.setDescription("Arıza");
        workOrder.setPriority("MEDIUM");
        workOrder.setServiceType("PAID");
    }

    @Test
    void createWorkOrder_WithWhatsapp_CallsNotificationClient() {
        when(customerRepository.findById(1L)).thenReturn(Optional.of(customer));
        when(deviceRepository.findById(10L)).thenReturn(Optional.of(device));
        when(workOrderRepository.save(any(WorkOrder.class))).thenAnswer(inv -> {
            WorkOrder wo = inv.getArgument(0);
            wo.setId(42L);
            return wo;
        });

        WorkOrder created = workOrderService.createWorkOrder(workOrder);
        assertEquals("OPEN", created.getStatus());
        verify(whatsAppNotificationClient).sendNotification(anyString(), anyString());
    }

    @Test
    void createWorkOrder_WithoutWhatsapp_DoesNotNotify() {
        customer.setWhatsappNumber(null);
        when(customerRepository.findById(1L)).thenReturn(Optional.of(customer));
        when(deviceRepository.findById(10L)).thenReturn(Optional.of(device));
        when(workOrderRepository.save(any(WorkOrder.class))).thenAnswer(inv -> {
            WorkOrder wo = inv.getArgument(0);
            wo.setId(43L);
            return wo;
        });

        workOrderService.createWorkOrder(workOrder);
        verify(whatsAppNotificationClient, never()).sendNotification(anyString(), anyString());
    }
}
