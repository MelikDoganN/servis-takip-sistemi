package com.servis.backend.controller;

import com.servis.backend.entity.Technician;
import com.servis.backend.service.TechnicianService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/technicians")
public class TechnicianController {

    @Autowired
    private TechnicianService technicianService;

    @GetMapping
    public List<Technician> getAllTechnicians() {
        return technicianService.getAllTechnicians();
    }

    @GetMapping("/{id}")
    public ResponseEntity<Technician> getTechnicianById(@PathVariable Long id) {
        return ResponseEntity.ok(technicianService.getTechnicianById(id));
    }

    // Sadece Admin ve Bölge Yöneticisi ekleyebilir
    @PreAuthorize("hasAnyRole('ADMIN', 'REGION_MANAGER')")
    @PostMapping
    public ResponseEntity<Technician> createTechnician(@RequestBody Technician technician) {
        return new ResponseEntity<>(technicianService.createTechnician(technician), HttpStatus.CREATED);
    }

    @PreAuthorize("hasAnyRole('ADMIN', 'REGION_MANAGER')")
    @PutMapping("/{id}")
    public ResponseEntity<Technician> updateTechnician(@PathVariable Long id, @RequestBody Technician technician) {
        return ResponseEntity.ok(technicianService.updateTechnician(id, technician));
    }

    @PreAuthorize("hasRole('ADMIN')")
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteTechnician(@PathVariable Long id) {
        technicianService.deleteTechnician(id);
        return ResponseEntity.noContent().build();
    }

    /**
     * Müsait ve iş yükü maxWorkload'dan düşük olan teknisyenleri getir.
     * Örn: GET /api/technicians/available?maxWorkload=5
     */
    @GetMapping("/available")
    public List<Technician> getAvailableTechnicians(@RequestParam(defaultValue = "5") Integer maxWorkload) {
        return technicianService.getAvailableTechniciansWithMaxWorkload(maxWorkload);
    }
}