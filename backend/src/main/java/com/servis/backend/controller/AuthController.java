package com.servis.backend.controller;

import com.servis.backend.entity.Role;
import com.servis.backend.entity.User;
import com.servis.backend.repository.RoleRepository;
import com.servis.backend.repository.UserRepository;
import com.servis.backend.security.JwtService;
import com.servis.backend.security.RoleNames;
import com.servis.backend.service.AuditLogService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
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

    @Autowired
    private AuditLogService auditLogService;

    @PostMapping("/login")
    public ResponseEntity<?> login(
            @RequestBody Map<String, String> credentials,
            HttpServletRequest request) {
        String email = credentials != null ? credentials.get("email") : null;
        String password = credentials != null ? credentials.get("password") : null;
        String ip = clientIp(request);

        try {
            Authentication authentication = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(email, password)
            );

            if (authentication.isAuthenticated()) {
                List<String> roles = authentication.getAuthorities().stream()
                        .map(GrantedAuthority::getAuthority)
                        .toList();
                String token = jwtService.generateToken(email, roles);
                userRepository.findByEmail(email).ifPresent(user ->
                        auditLogService.recordLoginSuccess(user, ip));
                return ResponseEntity.ok(Map.of("token", token));
            } else {
                auditLogService.recordLoginFailed(email, ip);
                throw new UsernameNotFoundException("Geçersiz giriş bilgileri");
            }
        } catch (AuthenticationException ex) {
            auditLogService.recordLoginFailed(email, ip);
            throw ex;
        }
    }

    private static String clientIp(HttpServletRequest request) {
        if (request == null) {
            return null;
        }
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            return forwarded.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }

    /**
     * Public kayıt: yalnızca sistemde hiç kullanıcı yokken ilk ADMIN (bootstrap) oluşturur.
     * Sonraki kayıtlar kullanıcı yönetimi üzerinden yapılır.
     */
    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody Map<String, String> userData) {
        if (userRepository.count() > 0) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "Kayıt kapalı. Yeni kullanıcıları yönetici panelinden ekleyin."
            );
        }

        Role role = roleRepository.findByName(RoleNames.toDbName("ADMIN"))
                .or(() -> roleRepository.findByName("ADMIN"))
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
        return ResponseEntity.ok(Map.of("message", "İlk yönetici hesabı oluşturuldu", "id", saved.getId()));
    }
}
