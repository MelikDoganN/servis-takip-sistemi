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

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
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
            if (wo.getServiceNumber() == null) {
                wo.setServiceNumber("SRV-2026-000042");
            }
            return wo;
        });
        when(workOrderRepository.nextServiceNumberSequence()).thenReturn(42L);
        when(workOrderRepository.existsByServiceNumber(any())).thenReturn(false);

        WorkOrder created = workOrderService.createWorkOrder(workOrder);
        assertEquals("OPEN", created.getStatus());
        assertTrue(created.getServiceNumber().matches("SRV-\\d{4}-000042"));

        ArgumentCaptor<WhatsAppNotificationRequest> captor =
                ArgumentCaptor.forClass(WhatsAppNotificationRequest.class);
        verify(whatsAppNotificationClient, times(1)).sendNotification(captor.capture());
        assertEquals(WhatsAppNotificationRequest.EVENT_WORK_ORDER_CREATED, captor.getValue().getEventType());
        assertEquals(42L, captor.getValue().getWorkOrderId());
        assertEquals("905551112233", captor.getValue().getPhone());
        assertTrue(captor.getValue().getMessage().contains("Servis No:"));
        assertTrue(captor.getValue().getMessage().contains("000042"));
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
        when(workOrderRepository.nextServiceNumberSequence()).thenReturn(43L);
        when(workOrderRepository.existsByServiceNumber(any())).thenReturn(false);

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
        when(workOrderRepository.nextServiceNumberSequence()).thenReturn(44L);
        when(workOrderRepository.existsByServiceNumber(any())).thenReturn(false);

        workOrderService.createWorkOrder(workOrder);
        verify(whatsAppNotificationClient, never()).sendNotification(any(WhatsAppNotificationRequest.class));
    }

    @Test
    void assignTechnician_NewTech_SendsAssignNotification() {
        WorkOrder existing = new WorkOrder();
        existing.setId(50L);
        existing.setServiceNumber("SRV-2026-000050");
        existing.setStatus("OPEN");
        existing.setCustomer(customer);
        existing.setDevice(device);
        existing.setDescription("Arıza");
        existing.setPriority("MEDIUM");

        when(workOrderRepository.findById(50L)).thenReturn(Optional.of(existing));
        when(technicianRepository.findById(7L)).thenReturn(Optional.of(technician));
        when(workOrderRepository.save(any(WorkOrder.class))).thenAnswer(inv -> inv.getArgument(0));

        workOrderService.assignTechnician(50L, 7L, createdBy);

        ArgumentCaptor<WhatsAppNotificationRequest> captor =
                ArgumentCaptor.forClass(WhatsAppNotificationRequest.class);
        verify(whatsAppNotificationClient, times(2)).sendNotification(captor.capture());
        List<WhatsAppNotificationRequest> sent = captor.getAllValues();

        WhatsAppNotificationRequest customerMsg = sent.stream()
                .filter(r -> WhatsAppNotificationRequest.EVENT_TECHNICIAN_ASSIGNED.equals(r.getEventType()))
                .findFirst()
                .orElseThrow();
        assertEquals("905551112233", customerMsg.getPhone());
        assertEquals("Ali Teknisyen", customerMsg.getTechnicianName());
        assertTrue(customerMsg.getMessage().contains("SRV-2026-000050"));

        WhatsAppNotificationRequest techMsg = sent.stream()
                .filter(r -> WhatsAppNotificationRequest.EVENT_TECHNICIAN_WORK_ORDER_ASSIGNED
                        .equals(r.getEventType()))
                .findFirst()
                .orElseThrow();
        assertEquals("905559998877", techMsg.getPhone());
        assertEquals("technician:7", techMsg.getEventKey());
        assertTrue(techMsg.getMessage().contains("SRV-2026-000050"));
        assertTrue(techMsg.getMessage().contains("Yeni İş Emri Atandı"));
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
        existing.setServiceNumber("SRV-2026-000052");
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
        assertTrue(captor.getValue().getMessage().contains("SRV-2026-000052"));
        assertTrue(captor.getValue().getMessage().contains("parça bekleniyor"));
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
        String open = WorkOrderService.statusChangeMessage("SRV-2026-000001", "OPEN");
        assertTrue(open.contains("SRV-2026-000001"));
        assertTrue(open.contains("açıldı"));
        String assigned = WorkOrderService.statusChangeMessage("SRV-2026-000001", "ASSIGNED");
        assertTrue(assigned.contains("teknisyen atandı"));
        String inProgress = WorkOrderService.statusChangeMessage("SRV-2026-000001", "IN_PROGRESS");
        assertTrue(inProgress.contains("işlem başladı"));
        String cancelled = WorkOrderService.statusChangeMessage("SRV-2026-000001", "CANCELLED");
        assertTrue(cancelled.contains("iptal edildi"));
    }

    @Test
    void getWorkOrderByServiceNumber_NotFound() {
        when(workOrderRepository.findByServiceNumber("SRV-2026-000099")).thenReturn(Optional.empty());
        assertThrows(ResponseStatusException.class,
                () -> workOrderService.getWorkOrderByServiceNumber("SRV-2026-000099"));
    }

    @Test
    void getWorkOrderByServiceNumber_Found() {
        WorkOrder existing = new WorkOrder();
        existing.setId(99L);
        existing.setServiceNumber("SRV-2026-000099");
        when(workOrderRepository.findByServiceNumber("SRV-2026-000099")).thenReturn(Optional.of(existing));
        WorkOrder found = workOrderService.getWorkOrderByServiceNumber("srv-2026-000099");
        assertEquals(99L, found.getId());
    }

    @Test
    void assignTechnician_TechMessageGoesToTechnicianPhone_NotCustomer() {
        WorkOrder existing = openWorkOrder(60L);
        when(workOrderRepository.findById(60L)).thenReturn(Optional.of(existing));
        when(technicianRepository.findById(7L)).thenReturn(Optional.of(technician));
        when(workOrderRepository.save(any(WorkOrder.class))).thenAnswer(inv -> inv.getArgument(0));

        workOrderService.assignTechnician(60L, 7L, createdBy);

        ArgumentCaptor<WhatsAppNotificationRequest> captor =
                ArgumentCaptor.forClass(WhatsAppNotificationRequest.class);
        verify(whatsAppNotificationClient, times(2)).sendNotification(captor.capture());

        WhatsAppNotificationRequest techMsg = captor.getAllValues().stream()
                .filter(r -> WhatsAppNotificationRequest.EVENT_TECHNICIAN_WORK_ORDER_ASSIGNED
                        .equals(r.getEventType()))
                .findFirst()
                .orElseThrow();
        assertEquals("905559998877", techMsg.getPhone());
        assertEquals("905551112233", customer.getWhatsappNumber());
        assertFalse(techMsg.getPhone().equals(customer.getWhatsappNumber()));
    }

    @Test
    void assignTechnician_NoTechPhone_AssignmentSucceeds_SkipsTechMessage() {
        technician.setWhatsappNumber(null);
        WorkOrder existing = openWorkOrder(61L);
        when(workOrderRepository.findById(61L)).thenReturn(Optional.of(existing));
        when(technicianRepository.findById(7L)).thenReturn(Optional.of(technician));
        when(workOrderRepository.save(any(WorkOrder.class))).thenAnswer(inv -> inv.getArgument(0));

        WorkOrder result = workOrderService.assignTechnician(61L, 7L, createdBy);
        assertEquals("ASSIGNED", result.getStatus());
        assertEquals(7L, result.getTechnician().getId());

        ArgumentCaptor<WhatsAppNotificationRequest> captor =
                ArgumentCaptor.forClass(WhatsAppNotificationRequest.class);
        verify(whatsAppNotificationClient, times(1)).sendNotification(captor.capture());
        assertEquals(WhatsAppNotificationRequest.EVENT_TECHNICIAN_ASSIGNED, captor.getValue().getEventType());
    }

    @Test
    void assignTechnician_DifferentTech_SendsNewTechMessage() {
        Technician first = technician;
        Technician second = new Technician();
        second.setId(8L);
        second.setCurrentWorkload(0);
        second.setWhatsappNumber("905551234567");
        User u2 = new User();
        u2.setFullName("Veli Teknisyen");
        second.setUser(u2);

        WorkOrder existing = openWorkOrder(62L);
        existing.setStatus("ASSIGNED");
        existing.setTechnician(first);

        when(workOrderRepository.findById(62L)).thenReturn(Optional.of(existing));
        when(technicianRepository.findById(8L)).thenReturn(Optional.of(second));
        when(workOrderRepository.save(any(WorkOrder.class))).thenAnswer(inv -> inv.getArgument(0));

        workOrderService.assignTechnician(62L, 8L, createdBy);

        ArgumentCaptor<WhatsAppNotificationRequest> captor =
                ArgumentCaptor.forClass(WhatsAppNotificationRequest.class);
        verify(whatsAppNotificationClient, times(2)).sendNotification(captor.capture());

        WhatsAppNotificationRequest techMsg = captor.getAllValues().stream()
                .filter(r -> WhatsAppNotificationRequest.EVENT_TECHNICIAN_WORK_ORDER_ASSIGNED
                        .equals(r.getEventType()))
                .findFirst()
                .orElseThrow();
        assertEquals("905551234567", techMsg.getPhone());
        assertEquals("technician:8", techMsg.getEventKey());
        assertEquals(8L, techMsg.getTechnicianId());
    }

    @Test
    void buildTechnicianMessage_ContainsServiceNumber_AndBelirtilmediForNulls() {
        WorkOrder wo = new WorkOrder();
        wo.setServiceNumber("SRV-2026-000070");
        wo.setDescription(".");
        wo.setPriority(null);
        wo.setCustomer(customer);
        Device bare = new Device();
        bare.setSerialNumber(null);
        wo.setDevice(bare);

        String msg = WorkOrderService.buildTechnicianWorkOrderAssignedMessage(wo);
        assertTrue(msg.contains("Servis No: SRV-2026-000070"));
        assertTrue(msg.contains("Cihaz: Belirtilmedi"));
        assertTrue(msg.contains("Seri No: Belirtilmedi"));
        assertTrue(msg.contains("Arıza: Belirtilmedi"));
        assertTrue(msg.contains("Öncelik: Belirtilmedi"));
        assertTrue(msg.contains("Tahmini Tamamlanma: Belirtilmedi"));
        assertFalse(msg.contains("null"));
    }

    @Test
    void buildTechnicianMessage_PriorityTurkish_AndBrandModel() {
        Brand brand = new Brand();
        brand.setName("Bosch");
        DeviceModel model = new DeviceModel();
        model.setName("Serie 6");
        model.setBrand(brand);
        device.setModel(model);
        device.setSerialNumber("SN-1");

        WorkOrder wo = new WorkOrder();
        wo.setServiceNumber("SRV-2026-000071");
        wo.setDescription("Motor arızası");
        wo.setPriority("HIGH");
        wo.setCustomer(customer);
        wo.setDevice(device);
        wo.setEstimatedCompletionAt(java.time.LocalDateTime.of(2026, 8, 10, 14, 30));

        String msg = WorkOrderService.buildTechnicianWorkOrderAssignedMessage(wo);
        assertTrue(msg.contains("Öncelik: Yüksek"));
        assertTrue(msg.contains("Cihaz: Bosch Serie 6"));
        assertTrue(msg.contains("Seri No: SN-1"));
        assertTrue(msg.contains("Arıza: Motor arızası"));
        assertTrue(msg.contains("10.08.2026 14:30"));
    }

    @Test
    void resolveTechnicianNotifyPhone_Normalizes_AndRejectsBlank() {
        technician.setWhatsappNumber("+90 555 999 88 77");
        assertEquals("905559998877", WorkOrderService.resolveTechnicianNotifyPhone(technician));
        technician.setWhatsappNumber("   ");
        assertNull(WorkOrderService.resolveTechnicianNotifyPhone(technician));
        assertNull(WorkOrderService.resolveTechnicianNotifyPhone(null));
    }

    private WorkOrder openWorkOrder(Long id) {
        WorkOrder existing = new WorkOrder();
        existing.setId(id);
        existing.setServiceNumber("SRV-2026-" + String.format("%06d", id));
        existing.setStatus("OPEN");
        existing.setCustomer(customer);
        existing.setDevice(device);
        existing.setDescription("Arıza");
        existing.setPriority("MEDIUM");
        return existing;
    }
}
