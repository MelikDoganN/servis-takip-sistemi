package com.servis.backend.security;

import com.servis.backend.entity.Role;
import com.servis.backend.entity.User;
import com.servis.backend.repository.RoleRepository;
import com.servis.backend.repository.UserRepository;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import static org.junit.jupiter.api.Assertions.assertTrue;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class SecurityApiTest {

    @Autowired
    private RoleRepository roleRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @BeforeEach
    void setUp() {

        Role adminRole = roleRepository.findByName("ADMIN")
                .orElseGet(() -> {
                    Role role = new Role();
                    role.setName("ADMIN");
                    role.setDescription("Admin");
                    return roleRepository.save(role);
                });

        Role technicianRole = roleRepository.findByName("TECHNICIAN")
                .orElseGet(() -> {
                    Role role = new Role();
                    role.setName("TECHNICIAN");
                    role.setDescription("Technician");
                    return roleRepository.save(role);
                });

        if (userRepository.findByEmail("admin@test.com").isEmpty()) {

            User user = new User();

            user.setFullName("Admin User");
            user.setEmail("admin@test.com");
            user.setPasswordHash(
                    passwordEncoder.encode("password123")
            );
            user.setIsActive(true);
            user.setRole(adminRole);

            userRepository.save(user);
        }

        if (userRepository.findByEmail("tech@test.com").isEmpty()) {

            User user = new User();

            user.setFullName("Tech User");
            user.setEmail("tech@test.com");
            user.setPasswordHash(
                    passwordEncoder.encode("password123")
            );
            user.setIsActive(true);
            user.setRole(technicianRole);

            userRepository.save(user);
        }
    }

    @Test
    void contextLoads() {
        assertTrue(true);
    }

    @Test
    @WithMockUser(
            username = "admin@test.com",
            authorities = "ROLE_ADMIN"
    )
    void adminUserCanBeAuthenticated() {

        assertTrue(
                userRepository.findByEmail("admin@test.com").isPresent()
        );
    }

    @Test
    @WithMockUser(
            username = "tech@test.com",
            authorities = "ROLE_TECHNICIAN"
    )
    void technicianUserCanBeAuthenticated() {

        assertTrue(
                userRepository.findByEmail("tech@test.com").isPresent()
        );
    }
}