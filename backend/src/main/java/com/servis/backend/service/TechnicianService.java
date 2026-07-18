package com.servis.backend.service;

import com.servis.backend.entity.Technician;
import com.servis.backend.repository.TechnicianRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class TechnicianService {

    @Autowired
    private TechnicianRepository technicianRepository;

    public List<Technician> getAllTechnicians() {
        return technicianRepository.findAll();
    }

    public Technician getTechnicianById(Long id) {
        return technicianRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Teknisyen bulunamadı: " + id));
    }

    public Technician createTechnician(Technician technician) {
        return technicianRepository.save(technician);
    }

    public Technician updateTechnician(Long id, Technician technicianDetails) {
        Technician existing = getTechnicianById(id);
        existing.setUser(technicianDetails.getUser());
        existing.setRegion(technicianDetails.getRegion());
        existing.setWhatsappNumber(technicianDetails.getWhatsappNumber());
        existing.setCurrentWorkload(technicianDetails.getCurrentWorkload());
        existing.setIsAvailable(technicianDetails.getIsAvailable());
        return technicianRepository.save(existing);
    }

    public void deleteTechnician(Long id) {
        technicianRepository.deleteById(id);
    }

    /**
     * Müsait ve iş yükü maksimum değerden düşük olan teknisyenleri getir.
     * Örneğin maxWorkload=5, 5'ten az iş yükü olanları getirir.
     */
    public List<Technician> getAvailableTechniciansWithMaxWorkload(Integer maxWorkload) {
        return technicianRepository.findByIsAvailableTrueAndCurrentWorkloadLessThan(maxWorkload);
    }

    /**
     * Teknisyenin iş yükünü 1 artır (atama yapıldığında).
     */
    public Technician incrementWorkload(Long technicianId) {
        Technician tech = getTechnicianById(technicianId);
        tech.setCurrentWorkload(tech.getCurrentWorkload() + 1);
        return technicianRepository.save(tech);
    }

    /**
     * Teknisyenin iş yükünü 1 azalt (iş emri kapandığında).
     */
    public Technician decrementWorkload(Long technicianId) {
        Technician tech = getTechnicianById(technicianId);
        if (tech.getCurrentWorkload() > 0) {
            tech.setCurrentWorkload(tech.getCurrentWorkload() - 1);
        }
        return technicianRepository.save(tech);
    }
}