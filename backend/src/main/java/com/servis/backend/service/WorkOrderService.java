package com.servis.backend.service;

import com.servis.backend.dto.WhatsAppNotificationRequest;
import com.servis.backend.entity.*;
import com.servis.backend.repository.CustomerRepository;
import com.servis.backend.repository.DeviceRepository;
import com.servis.backend.repository.RegionRepository;
import com.servis.backend.repository.TechnicianRepository;
import com.servis.backend.repository.WorkOrderRepository;
import com.servis.backend.repository.WorkOrderStatusHistoryRepository;
import com.servis.backend.util.PhoneNormalizer;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class WorkOrderService {

    private static final Logger log = LoggerFactory.getLogger(WorkOrderService.class);

    @Autowired
    private WorkOrderRepository workOrderRepository;

    @Autowired
    private WorkOrderStatusHistoryRepository historyRepository;

    @Autowired
    private TechnicianRepository technicianRepository;

    @Autowired
    private CustomerRepository customerRepository;

    @Autowired
    private DeviceRepository deviceRepository;

    @Autowired
    private RegionRepository regionRepository;

    @Autowired
    private WhatsAppNotificationClient whatsAppNotificationClient;

    public Page<WorkOrder> getAllWorkOrders(Pageable pageable) {
        return workOrderRepository.findAll(pageable);
    }

    public Page<WorkOrder> getWorkOrdersByStatus(String status, Pageable pageable) {
        return workOrderRepository.findByStatus(status, pageable);
    }

    public Page<WorkOrder> getWorkOrdersByTechnicianId(Long technicianId, Pageable pageable) {
        return workOrderRepository.findByTechnicianId(technicianId, pageable);
    }

    public Page<WorkOrder> getWorkOrdersByCustomerId(Long customerId, Pageable pageable) {
        return workOrderRepository.findByCustomerId(customerId, pageable);
    }

    public List<WorkOrder> getAllWorkOrders() {
        return workOrderRepository.findAll();
    }

    public WorkOrder getWorkOrderById(Long id) {
        return workOrderRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "İş emri bulunamadı: " + id));
    }

    /**
     * Client stub ID'lerini repository'den gerçek entity'lere çevirir.
     * createdBy controller tarafından principal'dan set edilmiş olmalıdır.
     */
    @Transactional
    public WorkOrder createWorkOrder(WorkOrder workOrder) {
        if (workOrder.getCreatedBy() == null || workOrder.getCreatedBy().getId() == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Kimlik doğrulama gerekli");
        }

        Long customerId = workOrder.getCustomer() != null ? workOrder.getCustomer().getId() : null;
        Long deviceId = workOrder.getDevice() != null ? workOrder.getDevice().getId() : null;
        if (customerId == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Müşteri zorunludur");
        }
        if (deviceId == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cihaz zorunludur");
        }

        Customer customer = customerRepository.findById(customerId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Müşteri bulunamadı: " + customerId));
        Device device = deviceRepository.findById(deviceId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Cihaz bulunamadı: " + deviceId));

        if (device.getCustomer() == null || device.getCustomer().getId() == null
                || !device.getCustomer().getId().equals(customer.getId())) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Seçilen cihaz bu müşteriye ait değildir."
            );
        }

        Technician technician = null;
        if (workOrder.getTechnician() != null && workOrder.getTechnician().getId() != null) {
            Long technicianId = workOrder.getTechnician().getId();
            technician = technicianRepository.findById(technicianId)
                    .orElseThrow(() -> new ResponseStatusException(
                            HttpStatus.NOT_FOUND, "Teknisyen bulunamadı: " + technicianId));
        }

        Long regionId = workOrder.getRegionId();
        if (regionId != null) {
            if (!regionRepository.existsById(regionId)) {
                throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Bölge bulunamadı: " + regionId);
            }
        }

        WorkOrder toSave = new WorkOrder();
        toSave.setCustomer(customer);
        toSave.setDevice(device);
        toSave.setTechnician(technician);
        toSave.setCreatedBy(workOrder.getCreatedBy());
        toSave.setRegionId(regionId);
        toSave.setDescription(workOrder.getDescription());
        toSave.setPriority(workOrder.getPriority());
        toSave.setServiceType(workOrder.getServiceType());
        toSave.setStatus(WorkOrderStatus.OPEN.name());

        WorkOrder saved = workOrderRepository.save(toSave);
        saveHistory(saved, null, null, WorkOrderStatus.OPEN.name(), "İş emri oluşturuldu", "WEB");

        notifyWorkOrderCreated(saved);

        return saved;
    }

    @Transactional
    public WorkOrder updateStatus(Long workOrderId, String newStatus, User changedBy, String channel) {
        return updateStatus(workOrderId, newStatus, changedBy, channel, null);
    }

    @Transactional
    public WorkOrder updateStatus(Long workOrderId, String newStatus, User changedBy, String channel,
                                  String technicianWhatsapp) {
        WorkOrder workOrder = getWorkOrderById(workOrderId);
        String oldStatus = workOrder.getStatus();

        if (technicianWhatsapp != null && !technicianWhatsapp.isBlank()) {
            assertTechnicianOwnsWorkOrder(workOrder, technicianWhatsapp);
        }

        if (oldStatus != null && oldStatus.equals(newStatus)) {
            return workOrder;
        }

        validateTransition(oldStatus, newStatus);

        workOrder.setStatus(newStatus);
        switch (newStatus) {
            case "ASSIGNED" -> workOrder.setAssignedAt(LocalDateTime.now());
            case "WAITING_PARTS" -> workOrder.setWaitingForPartsSince(LocalDateTime.now());
            case "RESOLVED" -> workOrder.setCompletedAt(LocalDateTime.now());
            case "CLOSED" -> workOrder.setClosedAt(LocalDateTime.now());
        }

        WorkOrder updated = workOrderRepository.save(workOrder);
        saveHistory(updated, changedBy, oldStatus, newStatus, oldStatus + " → " + newStatus, channel);
        notifyStatusChanged(updated, oldStatus, newStatus);
        return updated;
    }

    @Transactional
    public WorkOrder assignTechnician(Long workOrderId, Long technicianId, User changedBy) {
        WorkOrder workOrder = getWorkOrderById(workOrderId);
        Technician technician = technicianRepository.findById(technicianId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Teknisyen bulunamadı: " + technicianId));

        if (workOrder.getStatus().equals(WorkOrderStatus.CLOSED.name())) {
            throw new RuntimeException("Kapalı iş emrine teknisyen atanamaz");
        }

        Long previousTechId = workOrder.getTechnician() != null ? workOrder.getTechnician().getId() : null;
        boolean technicianChanged = previousTechId == null || !previousTechId.equals(technicianId);

        if (!technicianChanged && WorkOrderStatus.ASSIGNED.name().equals(workOrder.getStatus())) {
            return workOrder;
        }

        String oldStatus = workOrder.getStatus();
        workOrder.setTechnician(technician);
        workOrder.setStatus(WorkOrderStatus.ASSIGNED.name());
        workOrder.setAssignedAt(LocalDateTime.now());

        WorkOrder saved = workOrderRepository.save(workOrder);
        saveHistory(saved, changedBy, oldStatus, WorkOrderStatus.ASSIGNED.name(),
                "Teknisyen atandı", "WEB");

        if (technicianChanged) {
            technician.setCurrentWorkload(technician.getCurrentWorkload() + 1);
            technicianRepository.save(technician);
            notifyTechnicianAssigned(saved, technician);
        }

        return saved;
    }

    /**
     * Müşteri bildirim telefonu: whatsappNumber → phone fallback; ikisi de boşsa null.
     */
    static String resolveCustomerNotifyPhone(Customer customer) {
        if (customer == null) {
            return null;
        }
        if (customer.getWhatsappNumber() != null && !customer.getWhatsappNumber().isBlank()) {
            String normalized = PhoneNormalizer.normalize(customer.getWhatsappNumber());
            return normalized != null ? normalized : customer.getWhatsappNumber().trim();
        }
        if (customer.getPhone() != null && !customer.getPhone().isBlank()) {
            String normalized = PhoneNormalizer.normalize(customer.getPhone());
            return normalized != null ? normalized : customer.getPhone().trim();
        }
        return null;
    }

    private void notifyWorkOrderCreated(WorkOrder saved) {
        try {
            String phone = resolveCustomerNotifyPhone(saved.getCustomer());
            if (phone == null) {
                log.warn("WhatsApp create bildirimi atlandı: müşteri telefonu yok (wo={})", saved.getId());
                return;
            }
            StringBuilder message = new StringBuilder();
            message.append("Servis kaydınız oluşturuldu. İş emri numaranız: ").append(saved.getId()).append(".");
            if (saved.getDevice() != null && saved.getDevice().getModel() != null) {
                String brand = saved.getDevice().getModel().getBrand() != null
                        ? saved.getDevice().getModel().getBrand().getName()
                        : null;
                String model = saved.getDevice().getModel().getName();
                if (brand != null || model != null) {
                    message.append(" Cihaz: ");
                    if (brand != null) {
                        message.append(brand);
                        if (model != null) {
                            message.append(" ");
                        }
                    }
                    if (model != null) {
                        message.append(model);
                    }
                    message.append(".");
                }
            }

            WhatsAppNotificationRequest req = new WhatsAppNotificationRequest();
            req.setPhone(phone);
            req.setMessage(message.toString());
            req.setEventType(WhatsAppNotificationRequest.EVENT_WORK_ORDER_CREATED);
            req.setWorkOrderId(saved.getId());
            req.setTargetStatus(WorkOrderStatus.OPEN.name());
            req.setEventKey(WorkOrderStatus.OPEN.name());
            whatsAppNotificationClient.sendNotification(req);
        } catch (Exception e) {
            log.warn("WhatsApp create bildirimi başarısız (wo={}): {}", saved.getId(), e.getClass().getSimpleName());
        }
    }

    private void notifyTechnicianAssigned(WorkOrder saved, Technician technician) {
        try {
            String phone = resolveCustomerNotifyPhone(saved.getCustomer());
            if (phone == null) {
                log.warn("WhatsApp assign bildirimi atlandı: müşteri telefonu yok (wo={})", saved.getId());
                return;
            }
            String techName = technician.getUser() != null && technician.getUser().getFullName() != null
                    ? technician.getUser().getFullName()
                    : "teknisyen";
            WhatsAppNotificationRequest req = new WhatsAppNotificationRequest();
            req.setPhone(phone);
            req.setMessage("Cihazınız için teknisyen atandı: " + techName + ".");
            req.setEventType(WhatsAppNotificationRequest.EVENT_TECHNICIAN_ASSIGNED);
            req.setWorkOrderId(saved.getId());
            req.setTechnicianId(technician.getId());
            req.setTechnicianName(techName);
            req.setEventKey("tech:" + technician.getId());
            whatsAppNotificationClient.sendNotification(req);
        } catch (Exception e) {
            log.warn("WhatsApp assign bildirimi başarısız (wo={}): {}", saved.getId(), e.getClass().getSimpleName());
        }
    }

    private void notifyStatusChanged(WorkOrder updated, String oldStatus, String newStatus) {
        try {
            if (oldStatus != null && oldStatus.equals(newStatus)) {
                return;
            }
            String phone = resolveCustomerNotifyPhone(updated.getCustomer());
            if (phone == null) {
                log.warn("WhatsApp status bildirimi atlandı: müşteri telefonu yok (wo={})", updated.getId());
                return;
            }
            String message = statusChangeMessage(newStatus);
            if (message == null) {
                return;
            }
            WhatsAppNotificationRequest req = new WhatsAppNotificationRequest();
            req.setPhone(phone);
            req.setMessage(message);
            req.setEventType(WhatsAppNotificationRequest.EVENT_STATUS_CHANGED);
            req.setWorkOrderId(updated.getId());
            req.setTargetStatus(newStatus);
            req.setEventKey(newStatus);
            whatsAppNotificationClient.sendNotification(req);
        } catch (Exception e) {
            log.warn("WhatsApp status bildirimi başarısız (wo={}): {}", updated.getId(), e.getClass().getSimpleName());
        }
    }

    static String statusChangeMessage(String status) {
        if (status == null) {
            return null;
        }
        return switch (status) {
            case "OPEN" -> "Servis kaydınız açıldı.";
            case "ASSIGNED" -> "Servis kaydınıza teknisyen atandı.";
            case "IN_PROGRESS" -> "Cihazınızın inceleme ve onarım süreci başladı.";
            case "WAITING_PARTS" -> "Cihazınız için parça bekleniyor.";
            case "RESOLVED" -> "Cihazınızın işlemleri tamamlandı.";
            case "CLOSED" -> "Servis kaydınız kapatıldı. Cihazınız teslimata hazır olabilir.";
            case "CANCELLED" -> "Servis kaydınız iptal edildi.";
            default -> null;
        };
    }

    void assertTechnicianOwnsWorkOrder(WorkOrder workOrder, String technicianWhatsapp) {
        Technician assigned = workOrder.getTechnician();
        if (assigned == null || assigned.getWhatsappNumber() == null) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "Bu iş emri size atanmamış.");
        }
        if (!PhoneNormalizer.matches(technicianWhatsapp, assigned.getWhatsappNumber())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "Bu iş emri size atanmamış.");
        }
    }

    private void validateTransition(String oldStatus, String newStatus) {
        switch (oldStatus) {
            case "OPEN" -> {
                if (!newStatus.equals("ASSIGNED") && !newStatus.equals("CLOSED"))
                    throw new RuntimeException("OPEN → sadece ASSIGNED veya CLOSED");
            }
            case "ASSIGNED" -> {
                if (!newStatus.equals("WAITING_PARTS") && !newStatus.equals("RESOLVED"))
                    throw new RuntimeException("ASSIGNED → sadece WAITING_PARTS veya RESOLVED");
            }
            case "WAITING_PARTS" -> {
                if (!newStatus.equals("ASSIGNED") && !newStatus.equals("RESOLVED"))
                    throw new RuntimeException("WAITING_PARTS → sadece ASSIGNED veya RESOLVED");
            }
            case "RESOLVED" -> {
                if (!newStatus.equals("CLOSED"))
                    throw new RuntimeException("RESOLVED → sadece CLOSED");
            }
            case "CLOSED" -> throw new RuntimeException("Kapatılmış iş emri değiştirilemez");
            default -> throw new RuntimeException("Geçersiz durum: " + oldStatus);
        }
    }

    private void saveHistory(WorkOrder workOrder, User changedBy, String oldStatus, String newStatus,
                             String description, String channel) {
        WorkOrderStatusHistory history = new WorkOrderStatusHistory();
        history.setWorkOrder(workOrder);
        history.setChangedBy(changedBy);
        history.setOldStatus(oldStatus);
        history.setNewStatus(newStatus);
        history.setDescription(description);
        history.setChannel(channel);
        historyRepository.save(history);
    }

    public Map<String, List<WorkOrder>> getKanbanGroupedByStatus() {
        List<WorkOrder> all = workOrderRepository.findAll();
        return all.stream().collect(Collectors.groupingBy(WorkOrder::getStatus));
    }

    public List<WorkOrderStatusHistory> getStatusHistory(Long workOrderId) {
        return historyRepository.findByWorkOrderIdOrderByCreatedAtDesc(workOrderId);
    }
}
