package com.servis.backend.controller;

import com.servis.backend.dto.BotTechnicianLookupDto;
import com.servis.backend.dto.CreateTechnicianRequest;
import com.servis.backend.entity.Technician;
import com.servis.backend.security.BotApiKeyGuard;
import com.servis.backend.service.TechnicianService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/technicians")
public class TechnicianController {

    @Autowired
    private TechnicianService technicianService;

    @Autowired
    private BotApiKeyGuard botApiKeyGuard;

    @GetMapping
    public List<Technician> getAllTechnicians() {
        return technicianService.getAllTechnicians();
    }

    @GetMapping("/{id}")
    public ResponseEntity<Technician> getTechnicianById(@PathVariable Long id) {
        return ResponseEntity.ok(technicianService.getTechnicianById(id));
    }

    @PreAuthorize("hasAnyRole('ADMIN', 'REGION_MANAGER', 'CENTER_OPERATOR')")
    @PostMapping
    public ResponseEntity<Technician> createTechnician(@Valid @RequestBody CreateTechnicianRequest request) {
        return new ResponseEntity<>(technicianService.createTechnician(request), HttpStatus.CREATED);
    }

    @PreAuthorize("hasAnyRole('ADMIN', 'REGION_MANAGER', 'CENTER_OPERATOR')")
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

    /**
     * WhatsApp bot lookup — SecurityConfig permitAll; X-Bot-Api-Key zorunlu.
     * Dar DTO döner (email/password/role yok).
     */
    @GetMapping("/by-whatsapp/{whatsappNumber}")
    public ResponseEntity<?> getTechnicianByWhatsapp(
            @PathVariable String whatsappNumber,
            @RequestHeader(value = BotApiKeyGuard.HEADER_NAME, required = false) String botApiKey) {
        botApiKeyGuard.requireValid(botApiKey);
        try {
            Technician tech = technicianService.findByWhatsappNumber(whatsappNumber);
            String fullName = tech.getUser() != null ? tech.getUser().getFullName() : null;
            return ResponseEntity.ok(new BotTechnicianLookupDto(
                    tech.getId(),
                    fullName,
                    tech.getWhatsappNumber(),
                    tech.getIsAvailable()
            ));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", "Teknisyen bulunamadı"));
        }
    }
}
