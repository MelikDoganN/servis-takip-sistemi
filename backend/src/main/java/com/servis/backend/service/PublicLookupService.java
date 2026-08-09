package com.servis.backend.service;

import com.servis.backend.dto.PublicServiceStatusDto;
import com.servis.backend.dto.PublicWarrantyDto;
import com.servis.backend.dto.WarrantyDeviceInfoDto;
import com.servis.backend.entity.Customer;
import com.servis.backend.entity.Device;
import com.servis.backend.entity.WorkOrder;
import com.servis.backend.repository.DeviceRepository;
import com.servis.backend.repository.WorkOrderRepository;
import com.servis.backend.util.PhoneNormalizer;
import com.servis.backend.util.ServiceNumberGenerator;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

/**
 * Kurumsal site public sorguları — PII sızdırmaz; ownership doğrular.
 */
@Service
public class PublicLookupService {

    private static final String NOT_FOUND_DEVICE = "Bu seri numarasıyla cihaz bulunamadı.";
    private static final String NOT_FOUND_SERVICE = "Servis kaydı bulunamadı.";

    @Autowired
    private DeviceRepository deviceRepository;

    @Autowired
    private WorkOrderRepository workOrderRepository;

    @Autowired
    private WarrantyService warrantyService;

    @Transactional(readOnly = true)
    public PublicWarrantyDto lookupWarranty(String serialNumber) {
        if (serialNumber == null || serialNumber.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Seri numarası zorunludur");
        }

        Device device = deviceRepository.findBySerialNumber(serialNumber.trim())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, NOT_FOUND_DEVICE));

        // Warranty hesaplaması için mevcut servisi kullan; sonra PII alanlarını çıkar.
        WarrantyDeviceInfoDto full = warrantyService.getDeviceInfoBySerialNumber(device.getSerialNumber());

        PublicWarrantyDto dto = new PublicWarrantyDto();
        dto.setSerialNumber(full.getSerialNumber());
        dto.setBrand(full.getBrand());
        dto.setModel(full.getModel());
        dto.setWarrantyStart(full.getWarrantyStart());
        dto.setWarrantyEnd(full.getWarrantyEnd());
        dto.setWarrantyStatus(full.getWarrantyStatus());
        return dto;
    }

    @Transactional(readOnly = true)
    public PublicServiceStatusDto lookupService(String serviceNumber, String phone) {
        if (serviceNumber == null || serviceNumber.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Servis numarası zorunludur");
        }
        if (phone == null || phone.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Telefon zorunludur");
        }

        String normalized = ServiceNumberGenerator.normalize(serviceNumber);
        if (normalized == null || !ServiceNumberGenerator.looksLikeServiceNumber(normalized)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, NOT_FOUND_SERVICE);
        }

        WorkOrder wo = workOrderRepository.findByServiceNumber(normalized)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, NOT_FOUND_SERVICE));

        Customer customer = wo.getCustomer();
        if (customer == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, NOT_FOUND_SERVICE);
        }

        boolean owns = PhoneNormalizer.matches(phone, customer.getPhone())
                || PhoneNormalizer.matches(phone, customer.getWhatsappNumber());
        if (!owns) {
            // Enumeration önleme: yanlış telefon → güvenli 404
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, NOT_FOUND_SERVICE);
        }

        return toPublicServiceDto(wo);
    }

    private static PublicServiceStatusDto toPublicServiceDto(WorkOrder wo) {
        PublicServiceStatusDto dto = new PublicServiceStatusDto();
        dto.setServiceNumber(wo.getServiceNumber());
        dto.setStatus(wo.getStatus());
        dto.setEstimatedCompletionAt(wo.getEstimatedCompletionAt());
        dto.setUpdatedAt(wo.getUpdatedAt());

        Device device = wo.getDevice();
        if (device != null && device.getModel() != null) {
            dto.setModel(device.getModel().getName());
            if (device.getModel().getBrand() != null) {
                dto.setBrand(device.getModel().getBrand().getName());
            }
        }

        if (wo.getTechnician() != null && wo.getTechnician().getUser() != null) {
            String name = wo.getTechnician().getUser().getFullName();
            if (name != null && !name.isBlank()) {
                dto.setTechnicianName(name.trim());
            }
        }
        return dto;
    }
}
