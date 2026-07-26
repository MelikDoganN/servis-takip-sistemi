package com.servis.backend.controller;

import com.servis.backend.entity.WarrantyRecord;
import com.servis.backend.service.WarrantyService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/warranty")
public class WarrantyController {

    @Autowired
    private WarrantyService warrantyService;

    @Autowired
    private com.servis.backend.service.DeviceService deviceService;

    @Autowired
    private com.servis.backend.repository.WarrantyRecordRepository warrantyRecordRepository;

    @Autowired
    private com.servis.backend.repository.WorkOrderRepository workOrderRepository;

    // Örnek: POST /api/warranty/generate/1/PARTS
    @PostMapping("/generate/{deviceId}/{type}")
    public ResponseEntity<WarrantyRecord> generateWarranty(
            @PathVariable Long deviceId,
            @PathVariable String type) {
        return ResponseEntity.ok(warrantyService.createWarrantyRecord(deviceId, type));
    }

    // Örnek: GET /api/warranty/check/1/PARTS
    @GetMapping("/check/{deviceId}/{type}")
    public ResponseEntity<Boolean> checkWarranty(
            @PathVariable Long deviceId,
            @PathVariable String type) {
        return ResponseEntity.ok(warrantyService.isUnderWarranty(deviceId, type));
    }

    // YENİ: Seri numarası ile garanti bilgilerini getir (14. Gün)
    @GetMapping("/device/{serialNumber}")
    public ResponseEntity<Map<String, Object>> getWarrantyInfo(@PathVariable String serialNumber) {
        com.servis.backend.entity.Device device = deviceService.getDeviceBySerialNumber(serialNumber);
        if (device == null) {
            throw new RuntimeException("Cihaz bulunamadı: " + serialNumber);
        }

        java.util.List<WarrantyRecord> records = warrantyRecordRepository.findByDeviceId(device.getId());
        java.util.List<com.servis.backend.entity.WorkOrder> workOrders = workOrderRepository.findByDeviceId(device.getId());

        Map<String, Object> response = new HashMap<>();
        response.put("device", device);
        response.put("warrantyRecords", records);
        response.put("workOrders", workOrders);
        response.put("isUnderWarranty", warrantyService.isUnderWarranty(device.getId(), "GENERAL"));

        return ResponseEntity.ok(response);
    }
}