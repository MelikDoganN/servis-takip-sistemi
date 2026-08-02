package com.servis.backend.controller;

import com.servis.backend.dto.CreateDeviceModelRequest;
import com.servis.backend.dto.UpdateDeviceModelRequest;
import com.servis.backend.entity.DeviceModel;
import com.servis.backend.service.DeviceModelService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/models")
public class DeviceModelController {

    @Autowired
    private DeviceModelService deviceModelService;

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'CENTER_OPERATOR', 'REGION_MANAGER', 'TECHNICIAN')")
    public List<DeviceModel> getModels(@RequestParam(required = false) Long brandId) {
        return deviceModelService.getModels(brandId);
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<DeviceModel> createModel(@Valid @RequestBody CreateDeviceModelRequest request) {
        return new ResponseEntity<>(deviceModelService.createModel(request), HttpStatus.CREATED);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<DeviceModel> updateModel(
            @PathVariable Long id,
            @Valid @RequestBody UpdateDeviceModelRequest request) {
        return ResponseEntity.ok(deviceModelService.updateModel(id, request));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> deleteModel(@PathVariable Long id) {
        deviceModelService.deleteModel(id);
        return ResponseEntity.noContent().build();
    }
}
