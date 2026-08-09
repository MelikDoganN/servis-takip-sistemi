package com.servis.backend.api;

import com.servis.backend.audit.AuditActions;
import com.servis.backend.audit.AuditEntityTypes;
import com.servis.backend.audit.AuditEvent;
import com.servis.backend.audit.AuditSources;
import com.servis.backend.entity.AuditLog;
import com.servis.backend.entity.Role;
import com.servis.backend.entity.User;
import com.servis.backend.repository.AuditLogRepository;
import com.servis.backend.repository.RoleRepository;
import com.servis.backend.repository.UserRepository;
import com.servis.backend.service.AuditLogService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import static org.hamcrest.Matchers.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class AuditLogApiTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private RoleRepository roleRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private AuditLogRepository auditLogRepository;

    @Autowired
    private AuditLogService auditLogService;

    @BeforeEach
    void setUp() {
        Role adminRole = roleRepository.findByName("ADMIN").orElseGet(() -> {
            Role r = new Role();
            r.setName("ADMIN");
            r.setDescription("Admin");
            return roleRepository.save(r);
        });
        Role techRole = roleRepository.findByName("TECHNICIAN").orElseGet(() -> {
            Role r = new Role();
            r.setName("TECHNICIAN");
            r.setDescription("Tech");
            return roleRepository.save(r);
        });

        if (userRepository.findByEmail("audit.admin@test.com").isEmpty()) {
            User u = new User();
            u.setFullName("Audit Admin");
            u.setEmail("audit.admin@test.com");
            u.setPasswordHash(passwordEncoder.encode("password123"));
            u.setIsActive(true);
            u.setRole(adminRole);
            userRepository.save(u);
        }
        if (userRepository.findByEmail("audit.tech@test.com").isEmpty()) {
            User u = new User();
            u.setFullName("Audit Tech");
            u.setEmail("audit.tech@test.com");
            u.setPasswordHash(passwordEncoder.encode("password123"));
            u.setIsActive(true);
            u.setRole(techRole);
            userRepository.save(u);
        }
    }

    @Test
    void loginSuccess_WritesLoginSuccessAudit() throws Exception {
        mockMvc.perform(post("/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"audit.admin@test.com","password":"password123"}
                                """))
                .andExpect(status().isOk());

        assertTrue(auditLogRepository.findAll().stream()
                .anyMatch(a -> AuditActions.LOGIN_SUCCESS.equals(a.getAction())
                        && Boolean.TRUE.equals(a.getSuccess())
                        && a.getActorEmail() != null
                        && a.getActorEmail().equals("audit.admin@test.com")));
    }

    @Test
    void loginFailed_WritesLoginFailedWithoutPassword() throws Exception {
        mockMvc.perform(post("/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"audit.admin@test.com","password":"wrong-password"}
                                """))
                .andExpect(status().isUnauthorized());

        AuditLog failed = auditLogRepository.findAll().stream()
                .filter(a -> AuditActions.LOGIN_FAILED.equals(a.getAction()))
                .findFirst()
                .orElseThrow();
        assertFalse(failed.getSuccess());
        assertEquals("audit.admin@test.com", failed.getActorEmail());
        String meta = failed.getMetadataJson() != null ? failed.getMetadataJson() : "";
        assertFalse(meta.toLowerCase().contains("wrong-password"));
        assertFalse(meta.toLowerCase().contains("password"));
    }

    @Test
    @WithMockUser(username = "audit.admin@test.com", authorities = "ROLE_ADMIN")
    void admin_CanListAndFilterAuditLogs() throws Exception {
        auditLogService.safeRecord(AuditEvent.of(AuditActions.CUSTOMER_CREATED)
                .actor(null, "Melik Doğan", "melik@test.com", "ADMIN")
                .entity(AuditEntityTypes.CUSTOMER, 1L, "Melik Doğan")
                .description("Melik Doğan müşterisi oluşturuldu.")
                .source(AuditSources.WEB)
                .meta("serviceNumber", "SRV-2026-000021"));

        mockMvc.perform(get("/api/audit-logs")
                        .param("page", "0")
                        .param("size", "10")
                        .param("action", AuditActions.CUSTOMER_CREATED)
                        .param("search", "Melik"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content", not(empty())))
                .andExpect(jsonPath("$.content[0].action").value(AuditActions.CUSTOMER_CREATED))
                .andExpect(jsonPath("$.content[0].description", containsString("Melik")));
    }

    @Test
    @WithMockUser(username = "audit.admin@test.com", authorities = "ROLE_ADMIN")
    void admin_CanGetAuditLogById() throws Exception {
        auditLogService.safeRecord(AuditEvent.of(AuditActions.WORK_ORDER_CREATED)
                .description("SRV-2026-000021 numaralı iş emri oluşturuldu.")
                .entity(AuditEntityTypes.WORK_ORDER, 21L, "SRV-2026-000021")
                .source(AuditSources.WEB));

        Long id = auditLogRepository.findAll().stream()
                .filter(a -> AuditActions.WORK_ORDER_CREATED.equals(a.getAction()))
                .map(AuditLog::getId)
                .findFirst()
                .orElseThrow();

        mockMvc.perform(get("/api/audit-logs/{id}", id))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(id))
                .andExpect(jsonPath("$.entityDisplay").value("SRV-2026-000021"))
                .andExpect(jsonPath("$.action").value(AuditActions.WORK_ORDER_CREATED));
    }

    @Test
    @WithMockUser(username = "audit.tech@test.com", authorities = "ROLE_TECHNICIAN")
    void technician_CannotAccessAuditLogs() throws Exception {
        mockMvc.perform(get("/api/audit-logs")).andExpect(status().isForbidden());
    }

    @Test
    void unauthenticated_CannotAccessAuditLogs() throws Exception {
        mockMvc.perform(get("/api/audit-logs")).andExpect(status().isUnauthorized());
    }
}
