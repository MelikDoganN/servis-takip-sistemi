package com.servis.backend.service;

import com.servis.backend.dto.CreateTechnicianRequest;
import com.servis.backend.entity.Role;
import com.servis.backend.entity.Technician;
import com.servis.backend.entity.User;
import com.servis.backend.repository.RegionRepository;
import com.servis.backend.repository.RoleRepository;
import com.servis.backend.repository.TechnicianRepository;
import com.servis.backend.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class TechnicianServiceTest {

    @Mock
    private TechnicianRepository technicianRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private RoleRepository roleRepository;

    @Mock
    private RegionRepository regionRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @InjectMocks
    private TechnicianService technicianService;

    @Test
    void createTechnician_ShouldCreateUserThenTechnician() {
        CreateTechnicianRequest request = new CreateTechnicianRequest();
        request.setFullName("Ali Teknisyen");
        request.setEmail("ali@test.com");
        request.setPassword("secret1");
        request.setPhone("555");
        request.setWhatsappNumber("5551234");
        request.setIsAvailable(true);
        request.setCurrentWorkload(0);

        Role role = new Role();
        role.setName("TECHNICIAN");
        when(roleRepository.findByName("TECHNICIAN")).thenReturn(Optional.of(role));
        when(userRepository.findByEmail("ali@test.com")).thenReturn(Optional.empty());
        when(passwordEncoder.encode("secret1")).thenReturn("hashed");

        User savedUser = new User();
        savedUser.setId(10L);
        savedUser.setEmail("ali@test.com");
        savedUser.setRole(role);
        when(userRepository.save(any(User.class))).thenReturn(savedUser);

        when(technicianRepository.save(any(Technician.class))).thenAnswer(inv -> {
            Technician t = inv.getArgument(0);
            t.setId(1L);
            return t;
        });

        Technician created = technicianService.createTechnician(request);

        assertNotNull(created);
        assertEquals(10L, created.getUser().getId());
        assertEquals("5551234", created.getWhatsappNumber());
        assertTrue(created.getIsAvailable());
        verify(userRepository).save(any(User.class));
        verify(technicianRepository).save(any(Technician.class));
    }

    @Test
    void getAllTechnicians_ShouldReturnList() {
        when(technicianRepository.findAll()).thenReturn(java.util.List.of(new Technician()));
        assertFalse(technicianService.getAllTechnicians().isEmpty());
    }
}
