package com.servis.backend.controller;

import com.servis.backend.entity.DeviceModel;
import com.servis.backend.repository.DeviceModelRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/models")
public class DeviceModelController {

    @Autowired
    private DeviceModelRepository deviceModelRepository;

    @GetMapping
    public List<DeviceModel> getModels(@RequestParam(required = false) Long brandId) {
        if (brandId != null) {
            return deviceModelRepository.findByBrandId(brandId);
        }
        return deviceModelRepository.findAll();
    }
}