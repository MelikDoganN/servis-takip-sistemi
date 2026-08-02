package com.servis.backend.service;

import com.servis.backend.dto.CreateTechnicianRequest;
import com.servis.backend.entity.Region;
import com.servis.backend.entity.Role;
import com.servis.backend.entity.Technician;
import com.servis.backend.entity.User;
import com.servis.backend.repository.RegionRepository;
import com.servis.backend.repository.RoleRepository;
import com.servis.backend.repository.TechnicianRepository;
import com.servis.backend.repository.UserRepository;
import com.servis.backend.security.RoleNames;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
public class TechnicianService {

    @Autowired
    private TechnicianRepository technicianRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private RoleRepository roleRepository;

    @Autowired
    private RegionRepository regionRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    public List<Technician> getAllTechnicians() {
        return technicianRepository.findAll();
    }

    public Technician getTechnicianById(Long id) {
        return technicianRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Teknisyen bulunamadı: " + id));
    }

    public Technician findByWhatsappNumber(String whatsappNumber) {
        return technicianRepository.findByWhatsappNumber(whatsappNumber)
                .orElseThrow(() -> new RuntimeException("Teknisyen bulunamadı: " + whatsappNumber));
    }

    /**
     * Önce TECHNICIAN rolüyle User oluşturur, sonra Technician kaydına bağlar.
     */
    @Transactional
    public Technician createTechnician(CreateTechnicianRequest request) {
        if (request.getFullName() == null || request.getFullName().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Ad soyad zorunludur");
        }
        if (request.getEmail() == null || request.getEmail().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "E-posta zorunludur");
        }
        if (request.getPassword() == null || request.getPassword().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Şifre zorunludur");
        }
        if (request.getPassword().length() < 6) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Şifre en az 6 karakter olmalıdır");
        }
        if (request.getRegionId() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Bölge zorunludur");
        }
        if (request.getWhatsappNumber() == null || request.getWhatsappNumber().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "WhatsApp numarası zorunludur");
        }

        String email = request.getEmail().trim();
        if (userRepository.findByEmail(email).isPresent()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Bu e-posta ile kullanıcı zaten kayıtlı: " + email
            );
        }

        Role technicianRole = resolveRole("TECHNICIAN");

        User user = new User();
        user.setFullName(request.getFullName().trim());
        user.setEmail(email);
        user.setPasswordHash(passwordEncoder.encode(request.getPassword()));
        user.setPhone(blankToNull(request.getPhone()));
        user.setIsActive(true);
        user.setRole(technicianRole);
        User savedUser = userRepository.save(user);

        Region region = regionRepository.findById(request.getRegionId())
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "Bölge bulunamadı: " + request.getRegionId()
                ));

        Technician technician = new Technician();
        technician.setUser(savedUser);
        technician.setRegion(region);
        technician.setWhatsappNumber(request.getWhatsappNumber().trim());
        technician.setCurrentWorkload(
                request.getCurrentWorkload() != null ? request.getCurrentWorkload() : 0
        );
        technician.setIsAvailable(
                request.getIsAvailable() != null ? request.getIsAvailable() : true
        );

        return technicianRepository.save(technician);
    }

    public Technician updateTechnician(Long id, Technician technicianDetails) {
        Technician existing = getTechnicianById(id);
        if (technicianDetails.getUser() != null && technicianDetails.getUser().getId() != null) {
            User user = userRepository.findById(technicianDetails.getUser().getId())
                    .orElseThrow(() -> new RuntimeException(
                            "Kullanıcı bulunamadı: " + technicianDetails.getUser().getId()));
            existing.setUser(user);
        }
        existing.setRegion(technicianDetails.getRegion());
        existing.setWhatsappNumber(technicianDetails.getWhatsappNumber());
        existing.setCurrentWorkload(technicianDetails.getCurrentWorkload());
        existing.setIsAvailable(technicianDetails.getIsAvailable());
        return technicianRepository.save(existing);
    }

    public void deleteTechnician(Long id) {
        technicianRepository.deleteById(id);
    }

    public List<Technician> getAvailableTechniciansWithMaxWorkload(Integer maxWorkload) {
        return technicianRepository.findByIsAvailableTrueAndCurrentWorkloadLessThan(maxWorkload);
    }

    public Technician incrementWorkload(Long technicianId) {
        Technician tech = getTechnicianById(technicianId);
        tech.setCurrentWorkload(tech.getCurrentWorkload() + 1);
        return technicianRepository.save(tech);
    }

    public Technician decrementWorkload(Long technicianId) {
        Technician tech = getTechnicianById(technicianId);
        if (tech.getCurrentWorkload() > 0) {
            tech.setCurrentWorkload(tech.getCurrentWorkload() - 1);
        }
        return technicianRepository.save(tech);
    }

    private Role resolveRole(String roleName) {
        String dbName = RoleNames.toDbName(roleName);
        return roleRepository.findByName(dbName)
                .or(() -> roleRepository.findByName(roleName))
                .orElseThrow(() -> new RuntimeException("Rol bulunamadı: " + roleName));
    }

    private static String blankToNull(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }
}
