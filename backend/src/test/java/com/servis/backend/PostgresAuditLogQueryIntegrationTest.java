package com.servis.backend;

import com.servis.backend.audit.AuditActions;
import com.servis.backend.audit.AuditEntityTypes;
import com.servis.backend.audit.AuditEvent;
import com.servis.backend.audit.AuditSources;
import com.servis.backend.dto.AuditLogDto;
import com.servis.backend.entity.AuditLog;
import com.servis.backend.repository.AuditLogRepository;
import com.servis.backend.repository.AuditLogSpecifications;
import com.servis.backend.service.AuditLogService;
import io.zonky.test.db.postgres.embedded.EmbeddedPostgres;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;

import java.io.IOException;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Embedded PostgreSQL — audit list query null-parameter regression (SQLState 42P18).
 */
@SpringBootTest
class PostgresAuditLogQueryIntegrationTest {

    private static EmbeddedPostgres embeddedPostgres;

    @BeforeAll
    static void startPostgres() throws IOException {
        embeddedPostgres = EmbeddedPostgres.builder().start();
    }

    @AfterAll
    static void stopPostgres() throws IOException {
        if (embeddedPostgres != null) {
            embeddedPostgres.close();
        }
    }

    @DynamicPropertySource
    static void registerDatasource(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", () -> embeddedPostgres.getJdbcUrl("postgres", "postgres"));
        registry.add("spring.datasource.username", () -> "postgres");
        registry.add("spring.datasource.password", () -> "postgres");
        registry.add("spring.datasource.driver-class-name", () -> "org.postgresql.Driver");
        registry.add("spring.jpa.hibernate.ddl-auto", () -> "validate");
        registry.add("spring.flyway.enabled", () -> "true");
        registry.add("spring.flyway.locations", () -> "classpath:db/migration");
        registry.add("spring.flyway.baseline-on-migrate", () -> "true");
        registry.add("spring.test.database.replace", () -> "none");
    }

    @Autowired
    private AuditLogRepository auditLogRepository;

    @Autowired
    private AuditLogService auditLogService;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Test
    void auditLogsTableExists() {
        Integer count = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM information_schema.tables "
                        + "WHERE table_schema = 'public' AND table_name = 'audit_logs'",
                Integer.class);
        assertEquals(1, count);
    }

    @Test
    void search_AllFiltersNull_DoesNotThrowOnPostgres() {
        seedOneRow();

        assertDoesNotThrow(() -> {
            Page<AuditLogDto> page = auditLogService.search(
                    null, null, null, null, null, null, null, null,
                    PageRequest.of(0, 20, Sort.by(Sort.Direction.DESC, "createdAt")));
            assertFalse(page.isEmpty());
        });
    }

    @Test
    void search_RepositorySpec_AllNull_NoTypedNullBinds() {
        seedOneRow();

        assertDoesNotThrow(() -> {
            Page<AuditLog> page = auditLogRepository.findAll(
                    AuditLogSpecifications.filtering(null, null, null, null, null, null, null, null),
                    PageRequest.of(0, 10, Sort.by(Sort.Direction.DESC, "createdAt")));
            assertTrue(page.getTotalElements() >= 1);
        });
    }

    @Test
    void search_IndividualAndCombinedFilters_OnPostgres() {
        seedOneRow();
        seedFailRow();

        PageRequest pageable = PageRequest.of(0, 50, Sort.by(Sort.Direction.DESC, "createdAt"));

        assertFalse(auditLogService.search(
                AuditActions.CUSTOMER_CREATED, null, null, null, null, null, null, null, pageable)
                .isEmpty());

        assertFalse(auditLogService.search(
                null, AuditEntityTypes.CUSTOMER, null, null, null, null, null, null, pageable)
                .isEmpty());

        assertFalse(auditLogService.search(
                null, null, null, AuditSources.WEB, null, null, null, null, pageable)
                .isEmpty());

        assertFalse(auditLogService.search(
                null, null, null, null, true, null, null, null, pageable)
                .isEmpty());

        assertFalse(auditLogService.search(
                null, null, null, null, false, null, null, null, pageable)
                .isEmpty());

        assertFalse(auditLogService.search(
                null, null, null, null, null, null, null, "Melik", pageable)
                .isEmpty());

        LocalDateTime from = LocalDate.now().minusDays(1).atStartOfDay();
        LocalDateTime to = LocalDate.now().plusDays(1).atTime(LocalTime.MAX);
        assertFalse(auditLogService.search(
                null, null, null, null, null, from, null, null, pageable)
                .isEmpty());
        assertFalse(auditLogService.search(
                null, null, null, null, null, null, to, null, pageable)
                .isEmpty());
        assertFalse(auditLogService.search(
                null, null, null, null, null, from, to, null, pageable)
                .isEmpty());

        Page<AuditLogDto> sorted = auditLogService.search(
                null, null, null, null, null, null, null, null,
                PageRequest.of(0, 2, Sort.by(Sort.Direction.DESC, "createdAt")));
        assertTrue(sorted.getContent().size() <= 2);
        if (sorted.getContent().size() == 2) {
            LocalDateTime first = sorted.getContent().get(0).getCreatedAt();
            LocalDateTime second = sorted.getContent().get(1).getCreatedAt();
            if (first != null && second != null) {
                assertFalse(first.isBefore(second));
            }
        }
    }

    private void seedOneRow() {
        auditLogService.safeRecord(AuditEvent.of(AuditActions.CUSTOMER_CREATED)
                .actor(null, "Melik Doğan", "melik@test.com", "ADMIN")
                .entity(AuditEntityTypes.CUSTOMER, 1L, "Melik Doğan")
                .description("Melik Doğan müşterisi oluşturuldu.")
                .source(AuditSources.WEB)
                .success(true));
    }

    private void seedFailRow() {
        auditLogService.safeRecord(AuditEvent.of(AuditActions.LOGIN_FAILED)
                .description("Başarısız giriş denemesi.")
                .source(AuditSources.WEB)
                .success(false));
    }
}
