package com.servis.backend.controller;

import com.servis.backend.dto.WarrantyDeviceInfoDto;
import com.servis.backend.entity.WarrantyRecord;
import com.servis.backend.service.WarrantyService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/warranty")
public class WarrantyController {

    @Autowired
    private WarrantyService warrantyService;

    // Örnek: POST /api/warranty/generate/1/PARTS
    @PostMapping("/generate/{deviceId}/{type}")
    @PreAuthorize("hasAnyRole('ADMIN', 'CENTER_OPERATOR', 'REGION_MANAGER', 'TECHNICIAN')")
    public ResponseEntity<WarrantyRecord> generateWarranty(
            @PathVariable Long deviceId,
            @PathVariable String type) {
        return ResponseEntity.ok(warrantyService.createWarrantyRecord(deviceId, type));
    }

    // Örnek: GET /api/warranty/check/1/PARTS
    @GetMapping("/check/{deviceId}/{type}")
    @PreAuthorize("hasAnyRole('ADMIN', 'CENTER_OPERATOR', 'REGION_MANAGER', 'TECHNICIAN')")
    public ResponseEntity<Boolean> checkWarranty(
            @PathVariable Long deviceId,
            @PathVariable String type) {
        return ResponseEntity.ok(warrantyService.isUnderWarranty(deviceId, type));
    }

    @GetMapping("/device/{serialNumber}")
    @PreAuthorize("hasAnyRole('ADMIN', 'CENTER_OPERATOR', 'REGION_MANAGER', 'TECHNICIAN')")
    public ResponseEntity<WarrantyDeviceInfoDto> getDeviceBySerial(
            @PathVariable String serialNumber,
            @RequestParam(required = false) String phone) {
        if (phone != null && !phone.isBlank()) {
            return ResponseEntity.ok(
                    warrantyService.getDeviceInfoBySerialNumberForCustomer(serialNumber, phone));
        }
        return ResponseEntity.ok(warrantyService.getDeviceInfoBySerialNumber(serialNumber));
    }
}
