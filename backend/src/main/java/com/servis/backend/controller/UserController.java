package com.servis.backend.controller;

import com.servis.backend.entity.Role;
import com.servis.backend.entity.User;
import com.servis.backend.repository.RoleRepository;
import com.servis.backend.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/users")
@PreAuthorize("hasRole('ADMIN')") // Bu classtaki tüm metodlar sadece ADMIN yetkilisi çalıştırabilir
public class UserController {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private RoleRepository roleRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    // Yeni kullanıcı oluştur (Admin panelinden)
    @PostMapping
    public ResponseEntity<?> createUser(@RequestBody Map<String, String> userData) {
        String roleName = userData.get("role"); // ADMIN, CENTER_OPERATOR, TECHNICIAN, REGION_MANAGER

        Role role = roleRepository.findByName(roleName)
                .orElseThrow(() -> new RuntimeException("Rol bulunamadı: " + roleName));

        User user = new User();
        user.setFullName(userData.get("fullName"));
        user.setEmail(userData.get("email"));
        user.setPasswordHash(passwordEncoder.encode(userData.get("password")));
        user.setPhone(userData.get("phone"));
        user.setIsActive(true);
        user.setRole(role);

        User saved = userRepository.save(user);
        return ResponseEntity.ok(Map.of("message", "Kullanıcı oluşturuldu", "id", saved.getId()));
    }

    // Tüm kullanıcıları listele (Admin paneli için)
    @GetMapping
    public ResponseEntity<?> getAllUsers() {
        return ResponseEntity.ok(userRepository.findAll());
    }
}