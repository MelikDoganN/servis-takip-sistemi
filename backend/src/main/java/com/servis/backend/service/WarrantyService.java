package com.servis.backend.service;

import com.servis.backend.audit.AuditActions;
import com.servis.backend.audit.AuditEntityTypes;
import com.servis.backend.audit.AuditEvent;
import com.servis.backend.audit.AuditSources;
import com.servis.backend.dto.WarrantyDeviceInfoDto;
import com.servis.backend.entity.Device;
import com.servis.backend.entity.WarrantyRecord;
import com.servis.backend.entity.WorkOrder;
import com.servis.backend.repository.DeviceRepository;
import com.servis.backend.repository.WarrantyRecordRepository;
import com.servis.backend.repository.WorkOrderRepository;
import com.servis.backend.util.PhoneNormalizer;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Service
public class WarrantyService {

    @Autowired
    private DeviceRepository deviceRepository;

    @Autowired
    private WarrantyRecordRepository warrantyRecordRepository;

    @Autowired
    private WorkOrderRepository workOrderRepository;

    @Autowired
    private AuditLogService auditLogService;

    /**
     * G = T_başlangıç + F_süre
     * T_başlangıç = Cihazın satın alma tarihi (yoksa kurulum tarihi)
     * F_süre = DeviceModel'deki ilgili garanti ayı (PARTS, LABOR, GENERAL)
     */
    @Transactional
    public WarrantyRecord createWarrantyRecord(Long deviceId, String warrantyType) {
        Device device = deviceRepository.findById(deviceId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Cihaz bulunamadı: " + deviceId));

        String type = normalizeType(warrantyType);
        if (warrantyRecordRepository.findByDeviceIdAndWarrantyType(deviceId, type).isPresent()) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Bu cihaz için " + type + " garanti kaydı zaten mevcut."
            );
        }

        Integer months = resolveMonths(device, type);
        if (months == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Bu model için " + type + " garantisi tanımlı değil."
            );
        }
        if (months < 0) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Garanti ayı negatif olamaz."
            );
        }
        if (months == 0) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Bu model için " + type + " garantisi tanımlı değil."
            );
        }

        LocalDate startDate = resolveStartDate(device);
        if (startDate == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Cihazın satın alma veya kurulum tarihi bulunamadı."
            );
        }

        LocalDate endDate = startDate.plusMonths(months);

        WarrantyRecord record = new WarrantyRecord();
        record.setDevice(device);
        record.setWarrantyType(type);
        record.setStartDate(startDate);
        record.setEndDate(endDate);
        record.setDescription(months + " ay " + type + " garantisi");

        WarrantyRecord saved = warrantyRecordRepository.save(record);
        auditWarrantyCreated(saved, device);
        return saved;
    }

    /**
     * Cihaz oluşturulurken: tarih + GENERAL ay tanımlıysa ve kayıt yoksa GENERAL üretir.
     * Eksik bilgi veya duplicate durumunda sessizce atlar (cihaz create'i bozmaz).
     */
    @Transactional
    public void tryCreateGeneralWarrantyIfPossible(Long deviceId) {
        Device device = deviceRepository.findById(deviceId).orElse(null);
        if (device == null || device.getModel() == null) {
            return;
        }
        if (warrantyRecordRepository.findByDeviceIdAndWarrantyType(deviceId, "GENERAL").isPresent()) {
            return;
        }
        Integer months = device.getModel().getGeneralWarrantyMonths();
        if (months == null || months <= 0) {
            return;
        }
        LocalDate startDate = resolveStartDate(device);
        if (startDate == null) {
            return;
        }

        WarrantyRecord record = new WarrantyRecord();
        record.setDevice(device);
        record.setWarrantyType("GENERAL");
        record.setStartDate(startDate);
        record.setEndDate(startDate.plusMonths(months));
        record.setDescription(months + " ay GENERAL garantisi");
        WarrantyRecord saved = warrantyRecordRepository.save(record);
        auditWarrantyCreated(saved, device);
    }

    private void auditWarrantyCreated(WarrantyRecord saved, Device device) {
        String serial = device != null && device.getSerialNumber() != null
                ? device.getSerialNumber() : ("Cihaz#" + (device != null ? device.getId() : "?"));
        String type = saved.getWarrantyType() != null ? saved.getWarrantyType() : "GARANTI";
        String display = serial + " / " + type;
        auditLogService.safeRecord(AuditEvent.of(AuditActions.WARRANTY_CREATED)
                .actor(auditLogService.currentUserOrNull())
                .entity(AuditEntityTypes.WARRANTY, saved.getId(), display)
                .description(serial + " için " + type + " garantisi oluşturuldu.")
                .source(AuditSources.WEB)
                .success(true)
                .meta("warrantyId", saved.getId())
                .meta("deviceId", device != null ? device.getId() : null)
                .meta("warrantyType", type)
                .meta("serialNumber", device != null ? device.getSerialNumber() : null));
    }

    @Transactional(readOnly = true)
    public WarrantyDeviceInfoDto getDeviceInfoBySerialNumber(String serialNumber) {
        if (serialNumber == null || serialNumber.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Seri numarası zorunludur");
        }

        Device device = deviceRepository.findBySerialNumber(serialNumber.trim())
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Bu seri numarasıyla cihaz bulunamadı."
                ));

        return toDeviceInfoDto(device);
    }

    /**
     * Bot müşteri sorgusu: cihaz sahibinin telefonu ile eşleşmezse güvenli 404.
     */
    @Transactional(readOnly = true)
    public WarrantyDeviceInfoDto getDeviceInfoBySerialNumberForCustomer(String serialNumber, String phone) {
        if (serialNumber == null || serialNumber.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Seri numarası zorunludur");
        }
        if (phone == null || phone.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Telefon zorunludur");
        }

        Device device = deviceRepository.findBySerialNumber(serialNumber.trim())
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Bu seri numarasıyla cihaz bulunamadı."
                ));

        if (device.getCustomer() == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Bu seri numarasıyla cihaz bulunamadı.");
        }

        boolean owns = PhoneNormalizer.matches(phone, device.getCustomer().getWhatsappNumber())
                || PhoneNormalizer.matches(phone, device.getCustomer().getPhone());
        if (!owns) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Bu seri numarasıyla cihaz bulunamadı.");
        }

        return toDeviceInfoDto(device);
    }

    private WarrantyDeviceInfoDto toDeviceInfoDto(Device device) {
        WarrantyDeviceInfoDto dto = new WarrantyDeviceInfoDto();
        dto.setSerialNumber(device.getSerialNumber());

        if (device.getModel() != null) {
            dto.setModel(device.getModel().getName());
            dto.setDeviceName(device.getModel().getName());
            if (device.getModel().getBrand() != null) {
                dto.setBrand(device.getModel().getBrand().getName());
            }
        }
        if (device.getCustomer() != null) {
            dto.setCustomerName(device.getCustomer().getFullName());
        }

        applyWarrantySummary(dto, device);

        List<WorkOrder> orders = workOrderRepository.findByDeviceId(device.getId());
        dto.setServiceHistory(orders.stream().map(wo -> {
            WarrantyDeviceInfoDto.ServiceHistorySummary s = new WarrantyDeviceInfoDto.ServiceHistorySummary();
            s.setWorkOrderId(wo.getId());
            s.setStatus(wo.getStatus());
            s.setDescription(wo.getDescription());
            s.setCreatedAt(wo.getCreatedAt());
            return s;
        }).toList());

        return dto;
    }

    private void applyWarrantySummary(WarrantyDeviceInfoDto dto, Device device) {
        Optional<WarrantyRecord> existing = warrantyRecordRepository
                .findByDeviceIdAndWarrantyType(device.getId(), "GENERAL");
        if (existing.isPresent()) {
            WarrantyRecord record = existing.get();
            dto.setWarrantyStart(record.getStartDate());
            dto.setWarrantyEnd(record.getEndDate());
            dto.setWarrantyStatus(resolveStatus(record.getEndDate()));
            return;
        }

        Integer months = device.getModel() != null ? device.getModel().getGeneralWarrantyMonths() : null;
        if (months == null) {
            dto.setWarrantyStatus("TANIMLANMAMIS");
            return;
        }
        if (months < 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Garanti ayı negatif olamaz.");
        }
        if (months == 0) {
            dto.setWarrantyStatus("TANIMLANMAMIS");
            return;
        }

        LocalDate startDate = resolveStartDate(device);
        if (startDate == null) {
            dto.setWarrantyStatus("TARIH_EKSIK");
            return;
        }

        LocalDate endDate = startDate.plusMonths(months);
        dto.setWarrantyStart(startDate);
        dto.setWarrantyEnd(endDate);
        dto.setWarrantyStatus(resolveStatus(endDate));
    }

    private static String resolveStatus(LocalDate endDate) {
        if (endDate == null) {
            return "TANIMLANMAMIS";
        }
        return endDate.isAfter(LocalDate.now()) || endDate.isEqual(LocalDate.now())
                ? "AKTIF"
                : "SURESI_DOLMUS";
    }

    public boolean isUnderWarranty(Long deviceId, String warrantyType) {
        Optional<WarrantyRecord> record = warrantyRecordRepository
                .findByDeviceIdAndWarrantyType(deviceId, normalizeType(warrantyType));

        if (record.isPresent()) {
            return !record.get().getEndDate().isBefore(LocalDate.now());
        }
        return false;
    }

    private static String normalizeType(String warrantyType) {
        if (warrantyType == null || warrantyType.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Garanti tipi zorunludur");
        }
        String type = warrantyType.trim().toUpperCase();
        if (!type.equals("PARTS") && !type.equals("LABOR") && !type.equals("GENERAL")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Geçersiz garanti tipi: " + warrantyType);
        }
        return type;
    }

    private static Integer resolveMonths(Device device, String type) {
        if (device.getModel() == null) {
            return null;
        }
        return switch (type) {
            case "PARTS" -> device.getModel().getPartsWarrantyMonths();
            case "LABOR" -> device.getModel().getLaborWarrantyMonths();
            case "GENERAL" -> device.getModel().getGeneralWarrantyMonths();
            default -> null;
        };
    }

    private static LocalDate resolveStartDate(Device device) {
        if (device.getPurchaseDate() != null) {
            return device.getPurchaseDate();
        }
        return device.getInstallationDate();
    }
}
