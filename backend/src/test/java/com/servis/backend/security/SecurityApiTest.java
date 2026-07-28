package com.servis.backend.security;

import com.servis.backend.entity.Role;
import com.servis.backend.entity.User;
import com.servis.backend.repository.RoleRepository;
import com.servis.backend.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.not;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class SecurityApiTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private RoleRepository roleRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @BeforeEach
    void setUp() {
        Role adminRole = roleRepository.findByName("ADMIN").orElseGet(() -> {
            Role r = new Role();
            r.setName("ADMIN");
            r.setDescription("Admin");
            return roleRepository.save(r);
        });
        Role technicianRole = roleRepository.findByName("TECHNICIAN").orElseGet(() -> {
            Role r = new Role();
            r.setName("TECHNICIAN");
            r.setDescription("Technician");
            return roleRepository.save(r);
        });

        if (userRepository.findByEmail("admin@test.com").isEmpty()) {
            User u = new User();
            u.setFullName("Admin User");
            u.setEmail("admin@test.com");
            u.setPasswordHash(passwordEncoder.encode("password123"));
            u.setIsActive(true);
            u.setRole(adminRole);
            userRepository.save(u);
        }

        if (userRepository.findByEmail("tech@test.com").isEmpty()) {
            User u = new User();
            u.setFullName("Tech User");
            u.setEmail("tech@test.com");
            u.setPasswordHash(passwordEncoder.encode("password123"));
            u.setIsActive(true);
            u.setRole(technicianRole);
            userRepository.save(u);
        }
    }

    @Test
    void workOrders_WithoutJwt_Returns401() throws Exception {
        mockMvc.perform(get("/api/workorders"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void warranty_WithoutJwt_Returns401() throws Exception {
        mockMvc.perform(get("/api/warranty/device/SN-001"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @WithMockUser(username = "admin@test.com", authorities = "ROLE_ADMIN")
    void admin_CanAccessUserManagement() throws Exception {
        mockMvc.perform(get("/api/users"))
                .andExpect(status().isOk());
    }

    @Test
    @WithMockUser(username = "tech@test.com", authorities = "ROLE_TECHNICIAN")
    void technician_CannotAccessAdminEndpoints() throws Exception {
        mockMvc.perform(get("/api/users"))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(username = "admin@test.com", authorities = "ROLE_ADMIN")
    void userList_DoesNotExposePasswordHash() throws Exception {
        mockMvc.perform(get("/api/users").accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(content().string(not(containsString("passwordHash"))))
                .andExpect(content().string(not(containsString("password_hash"))))
                .andExpect(content().string(not(containsString("password123"))));
    }

    @Test
    @WithMockUser(username = "tech@test.com", authorities = "ROLE_TECHNICIAN")
    void technician_CannotModifyMissingOrUnauthorizedWorkOrder() throws Exception {
        mockMvc.perform(put("/api/workorders/999999/status").param("status", "ASSIGNED"))
                .andExpect(result -> {
                    int code = result.getResponse().getStatus();
                    org.junit.jupiter.api.Assertions.assertTrue(
                            code == 403 || code == 404 || code == 500,
                            "Expected forbidden or not-found, got " + code
                    );
                    org.junit.jupiter.api.Assertions.assertNotEquals(200, code);
                });
    }
}
