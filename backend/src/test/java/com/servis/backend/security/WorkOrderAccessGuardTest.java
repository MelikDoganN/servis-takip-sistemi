package com.servis.backend.security;

import com.servis.backend.entity.Technician;
import com.servis.backend.entity.User;
import com.servis.backend.entity.WorkOrder;
import com.servis.backend.repository.TechnicianRepository;
import com.servis.backend.service.UserService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class WorkOrderAccessGuardTest {

    @Mock
    private UserService userService;

    @Mock
    private TechnicianRepository technicianRepository;

    @InjectMocks
    private WorkOrderAccessGuard guard;

    @Test
    void admin_CanModifyAnyWorkOrder() {
        WorkOrder wo = new WorkOrder();
        var auth = new UsernamePasswordAuthenticationToken(
                "admin@test.com", null, List.of(new SimpleGrantedAuthority("ROLE_ADMIN")));
        assertDoesNotThrow(() -> guard.assertCanModify(wo, auth));
    }

    @Test
    void technician_CannotModifyUnassignedWorkOrder() {
        User techUser = new User();
        techUser.setId(10L);
        techUser.setEmail("tech@test.com");

        Technician tech = new Technician();
        tech.setId(1L);
        tech.setUser(techUser);

        WorkOrder wo = new WorkOrder();
        wo.setId(5L);
        // technician null → atanmamış

        when(userService.findByEmail("tech@test.com")).thenReturn(techUser);
        when(technicianRepository.findByUserId(10L)).thenReturn(Optional.of(tech));

        var auth = new UsernamePasswordAuthenticationToken(
                "tech@test.com", null, List.of(new SimpleGrantedAuthority("ROLE_TECHNICIAN")));

        assertThrows(AccessDeniedException.class, () -> guard.assertCanModify(wo, auth));
    }

    @Test
    void technician_CanModifyAssignedWorkOrder() {
        User techUser = new User();
        techUser.setId(10L);
        techUser.setEmail("tech@test.com");

        Technician tech = new Technician();
        tech.setId(1L);
        tech.setUser(techUser);

        WorkOrder wo = new WorkOrder();
        wo.setId(5L);
        wo.setTechnician(tech);

        when(userService.findByEmail("tech@test.com")).thenReturn(techUser);
        when(technicianRepository.findByUserId(10L)).thenReturn(Optional.of(tech));

        var auth = new UsernamePasswordAuthenticationToken(
                "tech@test.com", null, List.of(new SimpleGrantedAuthority("ROLE_TECHNICIAN")));

        assertDoesNotThrow(() -> guard.assertCanModify(wo, auth));
    }
}
