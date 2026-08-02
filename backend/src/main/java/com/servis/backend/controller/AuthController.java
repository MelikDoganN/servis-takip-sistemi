package com.servis.backend.controller;

import com.servis.backend.entity.Role;
import com.servis.backend.entity.User;
import com.servis.backend.repository.RoleRepository;
import com.servis.backend.repository.UserRepository;
import com.servis.backend.security.JwtService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/auth")
public class AuthController {

    @Autowired
    private AuthenticationManager authenticationManager;

    @Autowired
    private JwtService jwtService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private RoleRepository roleRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Map<String, String> credentials) {
        String email = credentials.get("email");
        String password = credentials.get("password");

        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(email, password)
        );

        if (authentication.isAuthenticated()) {
            String token = jwtService.generateToken(email);
            return ResponseEntity.ok(Map.of("token", token));
        } else {
            throw new UsernameNotFoundException("Geçersiz giriş bilgileri");
        }
    }

    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody Map<String, String> userData) {
        // Rolü bul yoksa oluştur
        Role role = roleRepository.findByName("ADMIN")
                .orElseGet(() -> {
                    Role newRole = new Role();
                    newRole.setName("ADMIN");
                    newRole.setDescription("Yönetici");
                    newRole.setCreatedAt(java.time.LocalDateTime.now());
                    return roleRepository.save(newRole);
                });

        User user = new User();
        user.setFullName(userData.get("fullName"));
        user.setEmail(userData.get("email"));
        user.setPasswordHash(passwordEncoder.encode(userData.get("password")));
        user.setPhone(userData.get("phone"));
        user.setIsActive(true);
        user.setRole(role);

        User saved = userRepository.save(user);
        return ResponseEntity.ok(Map.of("message", "Kullanıcı kaydedildi", "id", saved.getId()));
    }
}