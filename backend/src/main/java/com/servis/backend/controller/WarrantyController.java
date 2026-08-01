package com.servis.backend.controller;

import com.servis.backend.entity.Device;
import com.servis.backend.entity.WarrantyRecord;
import com.servis.backend.repository.DeviceRepository;
import com.servis.backend.repository.WarrantyRecordRepository;
import com.servis.backend.service.WarrantyService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/warranty")
public class WarrantyController {

    @Autowired
    private WarrantyService warrantyService;

    @Autowired
    private DeviceRepository deviceRepository;

    @Autowired
    private WarrantyRecordRepository warrantyRecordRepository;

    @PostMapping("/generate/{deviceId}/{type}")
    public ResponseEntity<WarrantyRecord> generateWarranty(
            @PathVariable Long deviceId,
            @PathVariable String type) {
        return ResponseEntity.ok(warrantyService.createWarrantyRecord(deviceId, type));
    }

    @GetMapping("/check/{deviceId}/{type}")
    public ResponseEntity<Boolean> checkWarranty(
            @PathVariable Long deviceId,
            @PathVariable String type) {
        return ResponseEntity.ok(warrantyService.isUnderWarranty(deviceId, type));
    }

    @GetMapping("/device/{serialNumber}")
    public ResponseEntity<?> getWarrantyInfo(
            @PathVariable String serialNumber,
            @RequestParam(required = false) String phone) {

        Device device = deviceRepository.findBySerialNumber(serialNumber)
                .orElse(null);

        if (device == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", "Cihaz bulunamadı."));
        }

        // Müşteri yetki kontrolü (phone parametresi varsa)
        if (phone != null && !phone.isEmpty()) {
            String customerPhone = device.getCustomer().getWhatsappNumber();
            if (customerPhone == null) {
                customerPhone = device.getCustomer().getPhone();
            }
            if (!phone.equals(customerPhone)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("error", "Bu cihaza erişim yetkiniz yok."));
            }
        }

        List<WarrantyRecord> records = warrantyRecordRepository.findByDeviceId(device.getId());
        Map<String, Object> response = new HashMap<>();
        response.put("device", device);
        response.put("warrantyRecords", records);
        response.put("isUnderWarranty", warrantyService.isUnderWarranty(device.getId(), "GENERAL"));
        return ResponseEntity.ok(response);
    }
}