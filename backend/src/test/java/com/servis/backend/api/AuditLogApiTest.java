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

import java.time.LocalDate;
import java.time.LocalDateTime;

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

    private Long actorUserId;

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

        User admin = userRepository.findByEmail("audit.admin@test.com").orElseGet(() -> {
            User u = new User();
            u.setFullName("Audit Admin");
            u.setEmail("audit.admin@test.com");
            u.setPasswordHash(passwordEncoder.encode("password123"));
            u.setIsActive(true);
            u.setRole(adminRole);
            return userRepository.save(u);
        });
        actorUserId = admin.getId();

        if (userRepository.findByEmail("audit.tech@test.com").isEmpty()) {
            User u = new User();
            u.setFullName("Audit Tech");
            u.setEmail("audit.tech@test.com");
            u.setPasswordHash(passwordEncoder.encode("password123"));
            u.setIsActive(true);
            u.setRole(techRole);
            userRepository.save(u);
        }

        seedFilterFixture();
    }

    private void seedFilterFixture() {
        auditLogService.safeRecord(AuditEvent.of(AuditActions.CUSTOMER_CREATED)
                .actor(actorUserId, "Melik Doğan", "melik@test.com", "ADMIN")
                .entity(AuditEntityTypes.CUSTOMER, 1L, "Melik Doğan")
                .description("Melik Doğan müşterisi oluşturuldu.")
                .source(AuditSources.WEB)
                .success(true)
                .meta("serviceNumber", "SRV-2026-000021"));

        auditLogService.safeRecord(AuditEvent.of(AuditActions.WORK_ORDER_CANCELLED)
                .actor(null, null, "cancelled@test.com", null)
                .entity(AuditEntityTypes.WORK_ORDER, 8L, "SRV-2026-000008")
                .description("İş emri iptal edildi.")
                .source(AuditSources.WEB)
                .success(false));

        auditLogService.safeRecord(AuditEvent.of(AuditActions.WHATSAPP_FAILED)
                .actor(null, "System", null, "SYSTEM")
                .entity(AuditEntityTypes.WHATSAPP, 9L, "WA-9")
                .description("WhatsApp bildirimi başarısız.")
                .source(AuditSources.WHATSAPP)
                .success(false));
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
                .filter(a -> AuditActions.LOGIN_FAILED.equals(a.getAction())
                        && "audit.admin@test.com".equals(a.getActorEmail()))
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
    void list_NoFilters_Returns200() throws Exception {
        mockMvc.perform(get("/api/audit-logs"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content").isArray())
                .andExpect(jsonPath("$.pageable").exists());
    }

    @Test
    @WithMockUser(username = "audit.admin@test.com", authorities = "ROLE_ADMIN")
    void list_AllFilterParamsOmitted_Returns200() throws Exception {
        // Production 500 regression: no optional filters → no typed NULL binds
        mockMvc.perform(get("/api/audit-logs")
                        .param("page", "0")
                        .param("size", "20"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content", not(empty())));
    }

    @Test
    @WithMockUser(username = "audit.admin@test.com", authorities = "ROLE_ADMIN")
    void list_SearchOnly() throws Exception {
        mockMvc.perform(get("/api/audit-logs").param("search", "Melik"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content", not(empty())))
                .andExpect(jsonPath("$.content[*].description", everyItem(containsString("Melik"))));
    }

    @Test
    @WithMockUser(username = "audit.admin@test.com", authorities = "ROLE_ADMIN")
    void list_ActionOnly() throws Exception {
        mockMvc.perform(get("/api/audit-logs").param("action", AuditActions.CUSTOMER_CREATED))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content", not(empty())))
                .andExpect(jsonPath("$.content[*].action", everyItem(is(AuditActions.CUSTOMER_CREATED))));
    }

    @Test
    @WithMockUser(username = "audit.admin@test.com", authorities = "ROLE_ADMIN")
    void list_EntityTypeOnly() throws Exception {
        mockMvc.perform(get("/api/audit-logs").param("entityType", AuditEntityTypes.CUSTOMER))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content", not(empty())))
                .andExpect(jsonPath("$.content[*].entityType", everyItem(is(AuditEntityTypes.CUSTOMER))));
    }

    @Test
    @WithMockUser(username = "audit.admin@test.com", authorities = "ROLE_ADMIN")
    void list_SourceOnly() throws Exception {
        mockMvc.perform(get("/api/audit-logs").param("source", AuditSources.WHATSAPP))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content", not(empty())))
                .andExpect(jsonPath("$.content[*].source", everyItem(is(AuditSources.WHATSAPP))));
    }

    @Test
    @WithMockUser(username = "audit.admin@test.com", authorities = "ROLE_ADMIN")
    void list_SuccessTrue() throws Exception {
        mockMvc.perform(get("/api/audit-logs").param("success", "true"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content", not(empty())))
                .andExpect(jsonPath("$.content[*].success", everyItem(is(true))));
    }

    @Test
    @WithMockUser(username = "audit.admin@test.com", authorities = "ROLE_ADMIN")
    void list_SuccessFalse() throws Exception {
        mockMvc.perform(get("/api/audit-logs").param("success", "false"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content", not(empty())))
                .andExpect(jsonPath("$.content[*].success", everyItem(is(false))));
    }

    @Test
    @WithMockUser(username = "audit.admin@test.com", authorities = "ROLE_ADMIN")
    void list_DateFromOnly() throws Exception {
        String from = LocalDate.now().minusDays(1).toString();
        mockMvc.perform(get("/api/audit-logs").param("dateFrom", from))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content", not(empty())));
    }

    @Test
    @WithMockUser(username = "audit.admin@test.com", authorities = "ROLE_ADMIN")
    void list_DateToOnly() throws Exception {
        String to = LocalDate.now().plusDays(1).toString();
        mockMvc.perform(get("/api/audit-logs").param("dateTo", to))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content", not(empty())));
    }

    @Test
    @WithMockUser(username = "audit.admin@test.com", authorities = "ROLE_ADMIN")
    void list_DateFromAndDateTo() throws Exception {
        String from = LocalDate.now().minusDays(1).toString();
        String to = LocalDate.now().plusDays(1).toString();
        mockMvc.perform(get("/api/audit-logs")
                        .param("dateFrom", from)
                        .param("dateTo", to))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content", not(empty())));
    }

    @Test
    @WithMockUser(username = "audit.admin@test.com", authorities = "ROLE_ADMIN")
    void list_ActorUserId() throws Exception {
        mockMvc.perform(get("/api/audit-logs").param("actorUserId", String.valueOf(actorUserId)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content", not(empty())))
                .andExpect(jsonPath("$.content[*].actorUserId", everyItem(equalTo(actorUserId.intValue()))));
    }

    @Test
    @WithMockUser(username = "audit.admin@test.com", authorities = "ROLE_ADMIN")
    void list_PaginationAndSortCreatedAtDesc() throws Exception {
        mockMvc.perform(get("/api/audit-logs")
                        .param("page", "0")
                        .param("size", "2"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.size").value(2))
                .andExpect(jsonPath("$.number").value(0))
                .andExpect(jsonPath("$.content", hasSize(lessThanOrEqualTo(2))));

        var page = auditLogService.search(
                null, null, null, null, null, null, null, null,
                org.springframework.data.domain.PageRequest.of(
                        0, 50,
                        org.springframework.data.domain.Sort.by(
                                org.springframework.data.domain.Sort.Direction.DESC, "createdAt")));
        assertTrue(page.getContent().size() >= 2);
        LocalDateTime first = page.getContent().get(0).getCreatedAt();
        LocalDateTime second = page.getContent().get(1).getCreatedAt();
        if (first != null && second != null) {
            assertFalse(first.isBefore(second));
        }
    }

    @Test
    @WithMockUser(username = "audit.admin@test.com", authorities = "ROLE_ADMIN")
    void admin_CanListAndFilterAuditLogs() throws Exception {
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
        Long id = auditLogRepository.findAll().stream()
                .filter(a -> AuditActions.CUSTOMER_CREATED.equals(a.getAction()))
                .map(AuditLog::getId)
                .findFirst()
                .orElseThrow();

        mockMvc.perform(get("/api/audit-logs/{id}", id))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(id))
                .andExpect(jsonPath("$.entityDisplay").value("Melik Doğan"))
                .andExpect(jsonPath("$.action").value(AuditActions.CUSTOMER_CREATED));
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

    @Test
    void repository_SpecWithAllNullFilters_DoesNotThrow() {
        assertDoesNotThrow(() -> auditLogService.search(
                null, null, null, null, null, null, null, null,
                org.springframework.data.domain.PageRequest.of(
                        0, 20,
                        org.springframework.data.domain.Sort.by(
                                org.springframework.data.domain.Sort.Direction.DESC, "createdAt"))
        ));
    }

    @Test
    void repository_DateRangeFilters_Work() {
        LocalDateTime from = LocalDate.now().minusDays(1).atStartOfDay();
        LocalDateTime to = LocalDate.now().plusDays(1).atTime(23, 59, 59, 999_000_000);
        var page = auditLogService.search(
                null, null, null, null, null, from, to, null,
                org.springframework.data.domain.PageRequest.of(0, 50));
        assertFalse(page.isEmpty());
    }
}
