package com.servis.backend.service;

import com.servis.backend.entity.*;
import com.servis.backend.repository.CustomerRepository;
import com.servis.backend.repository.DeviceRepository;
import com.servis.backend.repository.RegionRepository;
import com.servis.backend.repository.TechnicianRepository;
import com.servis.backend.repository.WorkOrderRepository;
import com.servis.backend.repository.WorkOrderStatusHistoryRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class WorkOrderService {

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
    private RestTemplate restTemplate;

    // === LİSTELEME (Sayfalama Destekli) ===
    public Page<WorkOrder> getAllWorkOrders(Pageable pageable) {
        return workOrderRepository.findAll(pageable);
    }

    public Page<WorkOrder> getWorkOrdersByStatus(String status, Pageable pageable) {
        return workOrderRepository.findByStatus(status, pageable);
    }

    public Page<WorkOrder> getWorkOrdersByTechnicianId(Long technicianId, Pageable pageable) {
        return workOrderRepository.findByTechnicianId(technicianId, pageable);
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
        saveHistory(saved, null, WorkOrderStatus.OPEN.name(), "İş emri oluşturuldu", "WEB");

        // WhatsApp bildirimi (remote taraf)
        String customerPhone = saved.getCustomer().getWhatsappNumber();
        if (customerPhone != null && !customerPhone.isEmpty()) {
            String message = String.format(
                    "Arıza kaydınız alındı. İş emri numaranız: %d\nDurumunuzu öğrenmek için: !durum %d\nGaranti sorgulamak için: !garanti %s",
                    saved.getId(), saved.getId(), saved.getDevice().getSerialNumber()
            );
            try {
                String botUrl = "http://localhost:8000/send-notification";
                Map<String, String> payload = Map.of("phone", customerPhone, "message", message);
                restTemplate.postForEntity(botUrl, payload, String.class);
                System.out.println("✅ Bildirim gönderildi: " + customerPhone);
            } catch (Exception e) {
                System.err.println("❌ Bildirim gönderilemedi: " + e.getMessage());
            }
        }

        return saved;
    }

    @Transactional
    public WorkOrder updateStatus(Long workOrderId, String newStatus, User changedBy, String channel) {
        WorkOrder workOrder = getWorkOrderById(workOrderId);
        String oldStatus = workOrder.getStatus();

        validateTransition(oldStatus, newStatus);

        workOrder.setStatus(newStatus);
        switch (newStatus) {
            case "ASSIGNED" -> workOrder.setAssignedAt(LocalDateTime.now());
            case "WAITING_PARTS" -> workOrder.setWaitingForPartsSince(LocalDateTime.now());
            case "RESOLVED" -> workOrder.setCompletedAt(LocalDateTime.now());
            case "CLOSED" -> workOrder.setClosedAt(LocalDateTime.now());
        }

        WorkOrder updated = workOrderRepository.save(workOrder);
        saveHistory(updated, changedBy, newStatus, oldStatus + " → " + newStatus, channel);
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

        workOrder.setTechnician(technician);
        workOrder.setStatus(WorkOrderStatus.ASSIGNED.name());
        workOrder.setAssignedAt(LocalDateTime.now());

        WorkOrder saved = workOrderRepository.save(workOrder);
        saveHistory(saved, changedBy, WorkOrderStatus.ASSIGNED.name(), "Teknisyen atandı: " + technician.getId(), "WEB");

        technician.setCurrentWorkload(technician.getCurrentWorkload() + 1);
        technicianRepository.save(technician);

        return saved;
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

    private void saveHistory(WorkOrder workOrder, User changedBy, String newStatus, String description, String channel) {
        WorkOrderStatusHistory history = new WorkOrderStatusHistory();
        history.setWorkOrder(workOrder);
        history.setChangedBy(changedBy);
        history.setOldStatus(workOrder.getStatus());
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
