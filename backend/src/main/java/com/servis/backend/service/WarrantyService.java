package com.servis.backend.service;

import java.time.LocalDate;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.servis.backend.dto.WarrantyDeviceInfoDto;
import com.servis.backend.entity.Device;
import com.servis.backend.entity.WarrantyRecord;
import com.servis.backend.entity.WorkOrder;
import com.servis.backend.repository.DeviceRepository;
import com.servis.backend.repository.WarrantyRecordRepository;
import com.servis.backend.repository.WorkOrderRepository;

@Service
public class WarrantyService {

    @Autowired
    private DeviceRepository deviceRepository;

    @Autowired
    private WarrantyRecordRepository warrantyRecordRepository;

    @Autowired
    private WorkOrderRepository workOrderRepository;

    /**
     *  G = T_başlangıç + F_süre
     * T_başlangıç = Cihazın satın alma tarihi (yoksa kurulum tarihi)
     * F_süre = DeviceModel'deki ilgili garanti ayı (PARTS, LABOR, GENERAL)
     */
    @Transactional
    public WarrantyRecord createWarrantyRecord(Long deviceId, String warrantyType) {
        Device device = deviceRepository.findById(deviceId)
                .orElseThrow(() -> new RuntimeException("Cihaz bulunamadı: " + deviceId));

        Integer months;
        switch (warrantyType.toUpperCase()) {
            case "PARTS":
                months = device.getModel().getPartsWarrantyMonths();
                break;
            case "LABOR":
                months = device.getModel().getLaborWarrantyMonths();
                break;
            case "GENERAL":
                months = device.getModel().getGeneralWarrantyMonths();
                break;
            default:
                throw new RuntimeException("Geçersiz garanti tipi: " + warrantyType);
        }

        if (months == null || months == 0) {
            throw new RuntimeException("Bu model için " + warrantyType + " garantisi tanımlı değil.");
        }

        LocalDate startDate = device.getPurchaseDate();
        if (startDate == null) {
            startDate = device.getInstallationDate();
        }
        if (startDate == null) {
            throw new RuntimeException("Cihazın satın alma veya kurulum tarihi bulunamadı.");
        }

        LocalDate endDate = startDate.plusMonths(months);

        WarrantyRecord record = new WarrantyRecord();
        record.setDevice(device);
        record.setWarrantyType(warrantyType.toUpperCase());
        record.setStartDate(startDate);
        record.setEndDate(endDate);
        record.setDescription(months + " ay " + warrantyType + " garantisi");

        return warrantyRecordRepository.save(record);
    }

    public boolean isUnderWarranty(Long deviceId, String warrantyType) {
        Optional<WarrantyRecord> record = warrantyRecordRepository
                .findByDeviceIdAndWarrantyType(deviceId, warrantyType.toUpperCase());

        if (record.isPresent()) {
            return !record.get().getEndDate().isBefore(LocalDate.now());
        }
        return false;
    }

    /**
     * Seri numarası ile güvenli özet DTO (hassas müşteri/user bilgisi yok).
     */
    public WarrantyDeviceInfoDto getWarrantyInfoBySerial(String serialNumber) {
        Device device = deviceRepository.findBySerialNumber(serialNumber)
                .orElseThrow(() -> new RuntimeException("Cihaz bulunamadı: " + serialNumber));

        String brandName = device.getModel() != null && device.getModel().getBrand() != null
                ? device.getModel().getBrand().getName()
                : null;
        String modelName = device.getModel() != null ? device.getModel().getName() : null;

        List<WarrantyRecord> records = warrantyRecordRepository.findByDeviceId(device.getId());
        Optional<WarrantyRecord> primary = records.stream()
                .filter(r -> "GENERAL".equalsIgnoreCase(r.getWarrantyType()))
                .findFirst()
                .or(() -> records.stream().max(Comparator.comparing(WarrantyRecord::getEndDate)));

        LocalDate start = primary.map(WarrantyRecord::getStartDate).orElse(null);
        LocalDate end = primary.map(WarrantyRecord::getEndDate).orElse(null);
        String status;
        if (end == null) {
            status = "UNKNOWN";
        } else if (end.isBefore(LocalDate.now())) {
            status = "EXPIRED";
        } else {
            status = "ACTIVE";
        }

        List<WorkOrder> workOrders = workOrderRepository.findByDeviceId(device.getId());
        List<WarrantyDeviceInfoDto.ServiceHistorySummary> history = workOrders.stream()
                .map(wo -> {
                    WarrantyDeviceInfoDto.ServiceHistorySummary s = new WarrantyDeviceInfoDto.ServiceHistorySummary();
                    s.setWorkOrderId(wo.getId());
                    s.setStatus(wo.getStatus());
                    s.setDescription(wo.getDescription());
                    s.setCreatedAt(wo.getCreatedAt());
                    return s;
                })
                .toList();

        WarrantyDeviceInfoDto dto = new WarrantyDeviceInfoDto();
        dto.setDeviceName(modelName != null ? modelName : serialNumber);
        dto.setBrand(brandName);
        dto.setModel(modelName);
        dto.setSerialNumber(device.getSerialNumber());
        dto.setWarrantyStart(start);
        dto.setWarrantyEnd(end);
        dto.setWarrantyStatus(status);
        dto.setServiceHistory(history);
        return dto;
    }
}
