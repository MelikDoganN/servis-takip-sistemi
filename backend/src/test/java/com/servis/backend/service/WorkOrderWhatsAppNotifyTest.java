package com.servis.backend.service;

import com.servis.backend.dto.WhatsAppNotificationRequest;
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
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.server.ResponseStatusException;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
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

    @Mock
    private NotificationService notificationService;

    @InjectMocks
    private WorkOrderService workOrderService;

    private WorkOrder workOrder;
    private Customer customer;
    private Device device;
    private User createdBy;
    private Technician technician;

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

        User techUser = new User();
        techUser.setFullName("Ali Teknisyen");
        technician = new Technician();
        technician.setId(7L);
        technician.setUser(techUser);
        technician.setCurrentWorkload(0);
        technician.setWhatsappNumber("905559998877");
    }

    @Test
    void createWorkOrder_WithWhatsapp_CallsNotificationClientOnce() {
        when(customerRepository.findById(1L)).thenReturn(Optional.of(customer));
        when(deviceRepository.findById(10L)).thenReturn(Optional.of(device));
        when(workOrderRepository.save(any(WorkOrder.class))).thenAnswer(inv -> {
            WorkOrder wo = inv.getArgument(0);
            wo.setId(42L);
            return wo;
        });

        WorkOrder created = workOrderService.createWorkOrder(workOrder);
        assertEquals("OPEN", created.getStatus());

        ArgumentCaptor<WhatsAppNotificationRequest> captor =
                ArgumentCaptor.forClass(WhatsAppNotificationRequest.class);
        verify(whatsAppNotificationClient, times(1)).sendNotification(captor.capture());
        assertEquals(WhatsAppNotificationRequest.EVENT_WORK_ORDER_CREATED, captor.getValue().getEventType());
        assertEquals(42L, captor.getValue().getWorkOrderId());
        assertEquals("905551112233", captor.getValue().getPhone());
    }

    @Test
    void createWorkOrder_PhoneFallback_WhenWhatsappEmpty() {
        customer.setWhatsappNumber(null);
        customer.setPhone("0555 111 22 33");
        when(customerRepository.findById(1L)).thenReturn(Optional.of(customer));
        when(deviceRepository.findById(10L)).thenReturn(Optional.of(device));
        when(workOrderRepository.save(any(WorkOrder.class))).thenAnswer(inv -> {
            WorkOrder wo = inv.getArgument(0);
            wo.setId(43L);
            return wo;
        });

        workOrderService.createWorkOrder(workOrder);

        ArgumentCaptor<WhatsAppNotificationRequest> captor =
                ArgumentCaptor.forClass(WhatsAppNotificationRequest.class);
        verify(whatsAppNotificationClient).sendNotification(captor.capture());
        assertEquals("905551112233", captor.getValue().getPhone());
    }

    @Test
    void createWorkOrder_BothPhonesEmpty_SkipsNotify() {
        customer.setWhatsappNumber(null);
        customer.setPhone(null);
        when(customerRepository.findById(1L)).thenReturn(Optional.of(customer));
        when(deviceRepository.findById(10L)).thenReturn(Optional.of(device));
        when(workOrderRepository.save(any(WorkOrder.class))).thenAnswer(inv -> {
            WorkOrder wo = inv.getArgument(0);
            wo.setId(44L);
            return wo;
        });

        workOrderService.createWorkOrder(workOrder);
        verify(whatsAppNotificationClient, never()).sendNotification(any(WhatsAppNotificationRequest.class));
    }

    @Test
    void assignTechnician_NewTech_SendsAssignNotification() {
        WorkOrder existing = new WorkOrder();
        existing.setId(50L);
        existing.setStatus("OPEN");
        existing.setCustomer(customer);
        existing.setDevice(device);

        when(workOrderRepository.findById(50L)).thenReturn(Optional.of(existing));
        when(technicianRepository.findById(7L)).thenReturn(Optional.of(technician));
        when(workOrderRepository.save(any(WorkOrder.class))).thenAnswer(inv -> inv.getArgument(0));

        workOrderService.assignTechnician(50L, 7L, createdBy);

        ArgumentCaptor<WhatsAppNotificationRequest> captor =
                ArgumentCaptor.forClass(WhatsAppNotificationRequest.class);
        verify(whatsAppNotificationClient).sendNotification(captor.capture());
        assertEquals(WhatsAppNotificationRequest.EVENT_TECHNICIAN_ASSIGNED, captor.getValue().getEventType());
        assertEquals("Ali Teknisyen", captor.getValue().getTechnicianName());
    }

    @Test
    void assignTechnician_SameTechAgain_NoExtraNotification() {
        WorkOrder existing = new WorkOrder();
        existing.setId(51L);
        existing.setStatus("ASSIGNED");
        existing.setCustomer(customer);
        existing.setDevice(device);
        existing.setTechnician(technician);

        when(workOrderRepository.findById(51L)).thenReturn(Optional.of(existing));
        when(technicianRepository.findById(7L)).thenReturn(Optional.of(technician));

        workOrderService.assignTechnician(51L, 7L, createdBy);
        verify(whatsAppNotificationClient, never()).sendNotification(any(WhatsAppNotificationRequest.class));
    }

    @Test
    void updateStatus_Changed_SendsTurkishMessage() {
        WorkOrder existing = new WorkOrder();
        existing.setId(52L);
        existing.setStatus("ASSIGNED");
        existing.setCustomer(customer);
        existing.setDevice(device);

        when(workOrderRepository.findById(52L)).thenReturn(Optional.of(existing));
        when(workOrderRepository.save(any(WorkOrder.class))).thenAnswer(inv -> inv.getArgument(0));

        workOrderService.updateStatus(52L, "WAITING_PARTS", createdBy, "WEB");

        ArgumentCaptor<WhatsAppNotificationRequest> captor =
                ArgumentCaptor.forClass(WhatsAppNotificationRequest.class);
        verify(whatsAppNotificationClient).sendNotification(captor.capture());
        assertEquals(WhatsAppNotificationRequest.EVENT_STATUS_CHANGED, captor.getValue().getEventType());
        assertEquals("Cihazınız için parça bekleniyor.", captor.getValue().getMessage());
        assertEquals("WAITING_PARTS", captor.getValue().getTargetStatus());
    }

    @Test
    void updateStatus_SameStatus_NoNotification() {
        WorkOrder existing = new WorkOrder();
        existing.setId(53L);
        existing.setStatus("ASSIGNED");
        existing.setCustomer(customer);

        when(workOrderRepository.findById(53L)).thenReturn(Optional.of(existing));

        workOrderService.updateStatus(53L, "ASSIGNED", createdBy, "WEB");
        verify(whatsAppNotificationClient, never()).sendNotification(any(WhatsAppNotificationRequest.class));
    }

    @Test
    void updateStatus_WrongTechnicianWhatsapp_Forbidden() {
        WorkOrder existing = new WorkOrder();
        existing.setId(54L);
        existing.setStatus("ASSIGNED");
        existing.setCustomer(customer);
        existing.setTechnician(technician);

        when(workOrderRepository.findById(54L)).thenReturn(Optional.of(existing));

        assertThrows(ResponseStatusException.class, () ->
                workOrderService.updateStatus(54L, "WAITING_PARTS", createdBy, "WHATSAPP", "905551112233"));
    }

    @Test
    void resolveCustomerNotifyPhone_PrefersWhatsappThenPhone() {
        customer.setWhatsappNumber("+90 555 111 22 33");
        customer.setPhone("05559998877");
        assertEquals("905551112233", WorkOrderService.resolveCustomerNotifyPhone(customer));

        customer.setWhatsappNumber(null);
        assertEquals("905559998877", WorkOrderService.resolveCustomerNotifyPhone(customer));

        customer.setPhone(null);
        assertEquals(null, WorkOrderService.resolveCustomerNotifyPhone(customer));
    }

    @Test
    void statusChangeMessage_MapsKnownStatuses() {
        assertEquals("Servis kaydınız açıldı.", WorkOrderService.statusChangeMessage("OPEN"));
        assertEquals("Servis kaydınıza teknisyen atandı.", WorkOrderService.statusChangeMessage("ASSIGNED"));
        assertEquals("Cihazınızın inceleme ve onarım süreci başladı.",
                WorkOrderService.statusChangeMessage("IN_PROGRESS"));
        assertEquals("Servis kaydınız iptal edildi.", WorkOrderService.statusChangeMessage("CANCELLED"));
    }
}
