package com.servis.backend.controller;

import com.servis.backend.dto.RegionDto;
import com.servis.backend.repository.RegionRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/regions")
public class RegionController {

    @Autowired
    private RegionRepository regionRepository;

    @GetMapping
    public ResponseEntity<List<RegionDto>> getAllRegions() {
        List<RegionDto> regions = regionRepository.findAll().stream()
                .map(r -> new RegionDto(r.getId(), r.getName(), r.getDescription()))
                .toList();
        return ResponseEntity.ok(regions);
    }
}
