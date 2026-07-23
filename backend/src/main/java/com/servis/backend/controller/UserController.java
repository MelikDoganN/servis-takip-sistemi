package com.servis.backend.controller;

import com.servis.backend.entity.Role;
import com.servis.backend.entity.User;
import com.servis.backend.repository.RoleRepository;
import com.servis.backend.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/users")
@PreAuthorize("hasRole('ADMIN')")
public class UserController {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private RoleRepository roleRepository;

    @GetMapping
    public ResponseEntity<Page<User>> getAllUsers(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) String search) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        if (search != null && !search.isEmpty()) {
            return ResponseEntity.ok(userRepository.findByFullNameContainingIgnoreCase(search, pageable));
        }
        return ResponseEntity.ok(userRepository.findAll(pageable));
    }

    @PostMapping
    public ResponseEntity<?> createUser(@RequestBody Map<String, String> userData) {
        String roleName = userData.get("role");
        Role role = roleRepository.findByName(roleName)
                .orElseThrow(() -> new RuntimeException("Rol bulunamadı: " + roleName));

        User user = new User();
        user.setFullName(userData.get("fullName"));
        user.setEmail(userData.get("email"));
        user.setPasswordHash(userData.get("password"));
        user.setPhone(userData.get("phone"));
        user.setIsActive(true);
        user.setRole(role);

        User saved = userRepository.save(user);
        return ResponseEntity.ok(Map.of("message", "Kullanıcı oluşturuldu", "id", saved.getId()));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteUser(@PathVariable Long id) {
        userRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/{id}/role")
    public ResponseEntity<User> updateUserRole(@PathVariable Long id, @RequestBody Map<String, String> roleData) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Kullanıcı bulunamadı"));
        Role role = roleRepository.findByName(roleData.get("role"))
                .orElseThrow(() -> new RuntimeException("Rol bulunamadı"));
        user.setRole(role);
        return ResponseEntity.ok(userRepository.save(user));
    }
}