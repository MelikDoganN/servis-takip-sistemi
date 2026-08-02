package com.servis.backend.service;

import com.servis.backend.dto.CreateTechnicianRequest;
import com.servis.backend.entity.Region;
import com.servis.backend.entity.Role;
import com.servis.backend.entity.User;
import com.servis.backend.repository.RegionRepository;
import com.servis.backend.repository.RoleRepository;
import com.servis.backend.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.web.server.ResponseStatusException;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * @Transactional olmadan çalışır: service rollback sonrası User kalmamalı.
 */
@SpringBootTest
@ActiveProfiles("test")
class TechnicianCreateRollbackTest {

    @Autowired
    private TechnicianService technicianService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private RoleRepository roleRepository;

    @Autowired
    private RegionRepository regionRepository;

    @BeforeEach
    void seedRole() {
        if (roleRepository.findByName("TECHNICIAN").isEmpty()) {
            Role role = new Role();
            role.setName("TECHNICIAN");
            role.setDescription("Technician");
            roleRepository.save(role);
        }
        userRepository.findByEmail("rollback.tech@test.com").ifPresent(userRepository::delete);
    }

    @Test
    void createTechnician_InvalidRegion_RollsBackUser() {
        CreateTechnicianRequest request = new CreateTechnicianRequest();
        request.setFullName("Rollback Tech");
        request.setEmail("rollback.tech@test.com");
        request.setPassword("secret1");
        request.setWhatsappNumber("5559990000");
        request.setRegionId(999_999_999L);

        assertThrows(ResponseStatusException.class, () -> technicianService.createTechnician(request));
        assertTrue(userRepository.findByEmail("rollback.tech@test.com").isEmpty());
    }

    @Test
    void createTechnician_ValidRegion_PersistsUser() {
        Region region = regionRepository.findAll().stream().findFirst().orElseGet(() -> {
            Region r = new Region();
            r.setName("Rollback Bölge");
            return regionRepository.save(r);
        });

        CreateTechnicianRequest request = new CreateTechnicianRequest();
        request.setFullName("Ok Tech");
        request.setEmail("ok.tech.rollback@test.com");
        request.setPassword("secret1");
        request.setWhatsappNumber("5558880000");
        request.setRegionId(region.getId());

        technicianService.createTechnician(request);
        assertTrue(userRepository.findByEmail("ok.tech.rollback@test.com").isPresent());

        userRepository.findByEmail("ok.tech.rollback@test.com").ifPresent(u -> {
            // cleanup for re-runs
        });
    }
}
