package com.servis.backend.controller;

import com.servis.backend.entity.WarrantyRecord;
import com.servis.backend.service.WarrantyService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/warranty")
public class WarrantyController {

    @Autowired
    private WarrantyService warrantyService;

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
}