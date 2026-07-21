package com.servis.backend.service;

import com.servis.backend.entity.Region;
import com.servis.backend.entity.Technician;
import com.servis.backend.entity.User;
import com.servis.backend.repository.TechnicianRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class TechnicianServiceTest {

    @Mock
    private TechnicianRepository technicianRepository;

    @InjectMocks
    private TechnicianService technicianService;

    @Test
    void createTechnician_ShouldSaveAndReturn() {
        Technician technician = new Technician();
        technician.setWhatsappNumber("5551234");
        technician.setIsAvailable(true);

        when(technicianRepository.save(any(Technician.class))).thenReturn(technician);

        Technician created = technicianService.createTechnician(technician);
        assertNotNull(created);
        assertEquals("5551234", created.getWhatsappNumber());
        assertTrue(created.getIsAvailable());
    }

    @Test
    void getAllTechnicians_ShouldReturnList() {
        when(technicianRepository.findAll()).thenReturn(java.util.List.of(new Technician()));
        assertFalse(technicianService.getAllTechnicians().isEmpty());
    }
}