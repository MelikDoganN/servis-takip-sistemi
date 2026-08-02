package com.servis.backend.service;

import com.servis.backend.dto.WhatsAppNotificationRequest;
import com.servis.backend.dto.WorkOrderLifecycleUpdate;
import com.servis.backend.dto.WorkOrderTimelineEventDto;
import com.servis.backend.entity.*;
import com.servis.backend.repository.CustomerRepository;
import com.servis.backend.repository.DeviceRepository;
import com.servis.backend.repository.RegionRepository;
import com.servis.backend.repository.TechnicianRepository;
import com.servis.backend.repository.WorkOrderRepository;
import com.servis.backend.repository.WorkOrderStatusHistoryRepository;
import com.servis.backend.util.PhoneNormalizer;
import com.servis.backend.util.ServiceNumberGenerator;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Locale;
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

    @Autowired
    private NotificationService notificationService;

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

    public WorkOrder getWorkOrderByServiceNumber(String serviceNumber) {
        String normalized = ServiceNumberGenerator.normalize(serviceNumber);
        if (normalized == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Servis kaydı bulunamadı.");
        }
        return workOrderRepository.findByServiceNumber(normalized)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Servis kaydı bulunamadı."));
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
        toSave.setServiceNumber(allocateUniqueServiceNumber());

        WorkOrder saved;
        try {
            saved = workOrderRepository.save(toSave);
        } catch (DataIntegrityViolationException ex) {
            // Nadir sequence/unique çakışmasında bir kez daha dene
            toSave.setServiceNumber(allocateUniqueServiceNumber());
            saved = workOrderRepository.save(toSave);
        }
        saveHistory(saved, null, null, WorkOrderStatus.OPEN.name(), "İş emri oluşturuldu", "WEB");

        notificationService.notifyWorkOrderCreated(saved);
        notifyWorkOrderCreated(saved);

        return saved;
    }

    String allocateUniqueServiceNumber() {
        for (int attempt = 0; attempt < 8; attempt++) {
            Long seq = nextServiceSequenceValue();
            String candidate = ServiceNumberGenerator.formatForNow(seq);
            if (!workOrderRepository.existsByServiceNumber(candidate)) {
                return candidate;
            }
        }
        throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR,
                "Servis numarası üretilemedi");
    }

    private Long nextServiceSequenceValue() {
        try {
            Long seq = workOrderRepository.nextServiceNumberSequence();
            if (seq != null && seq > 0) {
                return seq;
            }
        } catch (Exception e) {
            log.warn("service_number sequence kullanılamadı, fallback: {}", e.getClass().getSimpleName());
        }
        // H2 / sequence yok ortamları: benzersiz aday
        long fallback = Math.floorMod(System.nanoTime(), 1_000_000_000L);
        return fallback == 0 ? 1L : fallback;
    }

    @Transactional
    public WorkOrder updateStatus(Long workOrderId, String newStatus, User changedBy, String channel) {
        return updateStatus(workOrderId, newStatus, changedBy, channel, null, null);
    }

    @Transactional
    public WorkOrder updateStatus(Long workOrderId, String newStatus, User changedBy, String channel,
                                  String technicianWhatsapp) {
        return updateStatus(workOrderId, newStatus, changedBy, channel, technicianWhatsapp, null);
    }

    @Transactional
    public WorkOrder updateStatus(Long workOrderId, String newStatus, User changedBy, String channel,
                                  String technicianWhatsapp, WorkOrderLifecycleUpdate lifecycle) {
        WorkOrder workOrder = getWorkOrderById(workOrderId);
        String oldStatus = workOrder.getStatus();

        if (technicianWhatsapp != null && !technicianWhatsapp.isBlank()) {
            assertTechnicianOwnsWorkOrder(workOrder, technicianWhatsapp);
        }

        if (oldStatus != null && oldStatus.equals(newStatus)) {
            applyLifecycleFields(workOrder, newStatus, lifecycle);
            return workOrderRepository.save(workOrder);
        }

        validateTransition(oldStatus, newStatus);
        applyLifecycleFields(workOrder, newStatus, lifecycle);

        workOrder.setStatus(newStatus);
        LocalDateTime now = LocalDateTime.now();
        switch (newStatus) {
            case "ASSIGNED" -> workOrder.setAssignedAt(now);
            case "IN_PROGRESS" -> { /* no dedicated timestamp */ }
            case "WAITING_PARTS" -> workOrder.setWaitingForPartsSince(now);
            case "RESOLVED" -> {
                workOrder.setResolvedAt(now);
                workOrder.setCompletedAt(now);
            }
            case "READY_FOR_DELIVERY" -> { /* note may be set via lifecycle */ }
            case "DELIVERED" -> workOrder.setDeliveredAt(now);
            case "CLOSED" -> workOrder.setClosedAt(now);
            case "CANCELLED" -> { /* cancellationReason via lifecycle */ }
        }

        WorkOrder updated = workOrderRepository.save(workOrder);
        String historyDesc = buildHistoryDescription(oldStatus, newStatus, lifecycle);
        saveHistory(updated, changedBy, oldStatus, newStatus, historyDesc, channel);
        notificationService.notifyStatusChanged(updated, newStatus);
        notifyStatusChanged(updated, oldStatus, newStatus);
        return updated;
    }

    private void applyLifecycleFields(WorkOrder workOrder, String newStatus, WorkOrderLifecycleUpdate lifecycle) {
        if (lifecycle == null) {
            return;
        }
        if (lifecycle.getEstimatedCompletionAt() != null) {
            workOrder.setEstimatedCompletionAt(lifecycle.getEstimatedCompletionAt());
        }
        if (lifecycle.getResolutionNote() != null && !lifecycle.getResolutionNote().isBlank()) {
            workOrder.setResolutionNote(lifecycle.getResolutionNote().trim());
        }
        if (lifecycle.getDeliveryNote() != null && !lifecycle.getDeliveryNote().isBlank()) {
            workOrder.setDeliveryNote(lifecycle.getDeliveryNote().trim());
        }
        if (lifecycle.getCancellationReason() != null && !lifecycle.getCancellationReason().isBlank()) {
            workOrder.setCancellationReason(lifecycle.getCancellationReason().trim());
        } else if ("CANCELLED".equals(newStatus)
                && (workOrder.getCancellationReason() == null || workOrder.getCancellationReason().isBlank())) {
            // opsiyonel: neden yoksa boş bırak
        }
    }

    private static String buildHistoryDescription(String oldStatus, String newStatus,
                                                  WorkOrderLifecycleUpdate lifecycle) {
        String base = (oldStatus != null ? oldStatus : "?") + " → " + newStatus;
        if (lifecycle == null) {
            return base;
        }
        if ("CANCELLED".equals(newStatus) && lifecycle.getCancellationReason() != null
                && !lifecycle.getCancellationReason().isBlank()) {
            return base + " | İptal: " + lifecycle.getCancellationReason().trim();
        }
        if ("RESOLVED".equals(newStatus) && lifecycle.getResolutionNote() != null
                && !lifecycle.getResolutionNote().isBlank()) {
            return base + " | Çözüm: " + lifecycle.getResolutionNote().trim();
        }
        if (("DELIVERED".equals(newStatus) || "READY_FOR_DELIVERY".equals(newStatus))
                && lifecycle.getDeliveryNote() != null && !lifecycle.getDeliveryNote().isBlank()) {
            return base + " | Teslim: " + lifecycle.getDeliveryNote().trim();
        }
        return base;
    }

    @Transactional
    public WorkOrder assignTechnician(Long workOrderId, Long technicianId, User changedBy) {
        WorkOrder workOrder = getWorkOrderById(workOrderId);
        Technician technician = technicianRepository.findById(technicianId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Teknisyen bulunamadı: " + technicianId));

        if (workOrder.getStatus().equals(WorkOrderStatus.CLOSED.name())
                || workOrder.getStatus().equals(WorkOrderStatus.CANCELLED.name())) {
            throw new RuntimeException("Kapalı veya iptal iş emrine teknisyen atanamaz");
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
            String techName = technician.getUser() != null && technician.getUser().getFullName() != null
                    ? technician.getUser().getFullName()
                    : "teknisyen";
            notificationService.notifyTechnicianAssigned(saved, techName);
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
            String serviceNo = displayServiceNumber(saved);
            StringBuilder message = new StringBuilder();
            message.append("Servis kaydınız oluşturuldu.\nServis No: ").append(serviceNo);
            if (saved.getDevice() != null && saved.getDevice().getModel() != null) {
                String brand = saved.getDevice().getModel().getBrand() != null
                        ? saved.getDevice().getModel().getBrand().getName()
                        : null;
                String model = saved.getDevice().getModel().getName();
                if (brand != null || model != null) {
                    message.append("\nCihaz: ");
                    if (brand != null) {
                        message.append(brand);
                        if (model != null) {
                            message.append(" ");
                        }
                    }
                    if (model != null) {
                        message.append(model);
                    }
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
            String serviceNo = displayServiceNumber(saved);
            WhatsAppNotificationRequest req = new WhatsAppNotificationRequest();
            req.setPhone(phone);
            req.setMessage(serviceNo + " numaralı servis kaydınıza " + techName + " adlı teknisyen atanmıştır.");
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
            String message = statusChangeMessage(displayServiceNumber(updated), newStatus);
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

    static String displayServiceNumber(WorkOrder workOrder) {
        if (workOrder == null) {
            return "SRV-????-??????";
        }
        if (workOrder.getServiceNumber() != null && !workOrder.getServiceNumber().isBlank()) {
            return workOrder.getServiceNumber();
        }
        return "SRV-????-??????";
    }

    static String statusLabelTr(String status) {
        if (status == null) {
            return "Bilinmiyor";
        }
        return switch (status.toUpperCase(Locale.ROOT)) {
            case "OPEN" -> "Açık";
            case "ASSIGNED" -> "Teknisyen Atandı";
            case "IN_PROGRESS" -> "İşlemde";
            case "WAITING_PARTS" -> "Parça Bekliyor";
            case "RESOLVED" -> "Tamamlandı";
            case "READY_FOR_DELIVERY" -> "Teslime Hazır";
            case "DELIVERED" -> "Teslim Edildi";
            case "CLOSED" -> "Kapatıldı";
            case "CANCELLED" -> "İptal Edildi";
            default -> status;
        };
    }

    /** Geriye uyumluluk: yalnız status ile çağrı (testler). */
    static String statusChangeMessage(String status) {
        return statusChangeMessage("SRV-????-??????", status);
    }

    static String statusChangeMessage(String serviceNumber, String status) {
        if (status == null) {
            return null;
        }
        String sn = serviceNumber != null && !serviceNumber.isBlank() ? serviceNumber : "SRV-????-??????";
        return switch (status) {
            case "OPEN" -> sn + " numaralı servis kaydınız açıldı.";
            case "ASSIGNED" -> sn + " numaralı servis kaydınıza teknisyen atandı.";
            case "IN_PROGRESS" -> sn + " numaralı servis kaydınızda işlem başladı.";
            case "WAITING_PARTS" -> sn + " numaralı servis kaydınız için parça bekleniyor.";
            case "RESOLVED" -> sn + " numaralı servis kaydınız tamamlandı.";
            case "READY_FOR_DELIVERY" -> sn + " numaralı servis kaydınız teslime hazır.";
            case "DELIVERED" -> sn + " numaralı servis kaydınız teslim edildi.";
            case "CLOSED" -> sn + " numaralı servis kaydınız kapatıldı.";
            case "CANCELLED" -> sn + " numaralı servis kaydınız iptal edildi.";
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
        if (newStatus == null || newStatus.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Geçersiz durum geçişi");
        }
        if ("CANCELLED".equals(newStatus)) {
            if ("CLOSED".equals(oldStatus) || "CANCELLED".equals(oldStatus)) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "Kapalı veya iptal kaydı iptal edilemez");
            }
            return;
        }
        switch (oldStatus) {
            case "OPEN" -> {
                if (!newStatus.equals("ASSIGNED")) {
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                            "OPEN → sadece ASSIGNED veya CANCELLED");
                }
            }
            case "ASSIGNED" -> {
                if (!newStatus.equals("IN_PROGRESS") && !newStatus.equals("WAITING_PARTS")) {
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                            "ASSIGNED → sadece IN_PROGRESS, WAITING_PARTS veya CANCELLED");
                }
            }
            case "IN_PROGRESS" -> {
                if (!newStatus.equals("WAITING_PARTS") && !newStatus.equals("RESOLVED")) {
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                            "IN_PROGRESS → sadece WAITING_PARTS, RESOLVED veya CANCELLED");
                }
            }
            case "WAITING_PARTS" -> {
                if (!newStatus.equals("IN_PROGRESS") && !newStatus.equals("RESOLVED")) {
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                            "WAITING_PARTS → sadece IN_PROGRESS, RESOLVED veya CANCELLED");
                }
            }
            case "RESOLVED" -> {
                if (!newStatus.equals("READY_FOR_DELIVERY")) {
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                            "RESOLVED → sadece READY_FOR_DELIVERY veya CANCELLED");
                }
            }
            case "READY_FOR_DELIVERY" -> {
                if (!newStatus.equals("DELIVERED")) {
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                            "READY_FOR_DELIVERY → sadece DELIVERED veya CANCELLED");
                }
            }
            case "DELIVERED" -> {
                if (!newStatus.equals("CLOSED")) {
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                            "DELIVERED → sadece CLOSED veya CANCELLED");
                }
            }
            case "CLOSED" -> throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Kapatılmış iş emri değiştirilemez");
            case "CANCELLED" -> throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "İptal edilmiş iş emri değiştirilemez");
            default -> throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Geçersiz durum: " + oldStatus);
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

    public List<WorkOrderTimelineEventDto> getTimeline(Long workOrderId) {
        // varlık kontrolü
        getWorkOrderById(workOrderId);
        return historyRepository.findByWorkOrderIdOrderByCreatedAtDesc(workOrderId).stream()
                .map(this::toTimelineDto)
                .collect(Collectors.toList());
    }

    @Transactional
    public WorkOrder updateLifecycleNotes(Long workOrderId, WorkOrderLifecycleUpdate lifecycle, User changedBy) {
        WorkOrder workOrder = getWorkOrderById(workOrderId);
        if (WorkOrderStatus.CLOSED.name().equals(workOrder.getStatus())
                || WorkOrderStatus.CANCELLED.name().equals(workOrder.getStatus())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Kapalı veya iptal kaydı güncellenemez");
        }
        applyLifecycleFields(workOrder, workOrder.getStatus(), lifecycle);
        WorkOrder saved = workOrderRepository.save(workOrder);
        if (lifecycle != null) {
            saveHistory(saved, changedBy, saved.getStatus(), saved.getStatus(),
                    "Yaşam döngüsü alanları güncellendi", "WEB");
        }
        return saved;
    }

    private WorkOrderTimelineEventDto toTimelineDto(WorkOrderStatusHistory h) {
        WorkOrderTimelineEventDto dto = new WorkOrderTimelineEventDto();
        dto.setId(h.getId());
        dto.setOldStatus(h.getOldStatus());
        dto.setNewStatus(h.getNewStatus());
        dto.setDescription(h.getDescription());
        dto.setChannel(h.getChannel());
        dto.setCreatedAt(h.getCreatedAt());
        if (h.getChangedBy() != null) {
            dto.setChangedByUserId(h.getChangedBy().getId());
            dto.setChangedByName(h.getChangedBy().getFullName());
        }
        return dto;
    }
}
