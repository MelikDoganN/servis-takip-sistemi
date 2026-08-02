package com.servis.backend;

import io.zonky.test.db.postgres.embedded.EmbeddedPostgres;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.core.env.Environment;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;

import javax.sql.DataSource;
import java.io.IOException;
import java.sql.Connection;
import java.sql.DatabaseMetaData;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Embedded PostgreSQL + Flyway — gizli bilgi / dış Railway bağlantısı kullanmaz.
 */
@SpringBootTest
class PostgresFlywayIntegrationTest {

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
    private DataSource dataSource;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private Environment environment;

    @Test
    void usesPostgreSQLNotH2() throws Exception {
        try (Connection connection = dataSource.getConnection()) {
            DatabaseMetaData metaData = connection.getMetaData();
            String product = metaData.getDatabaseProductName();
            String url = metaData.getURL();

            assertTrue(product.toLowerCase().contains("postgresql"), "Expected PostgreSQL, got: " + product);
            assertTrue(url.startsWith("jdbc:postgresql:"), "Expected PostgreSQL JDBC URL, got: " + url);
            assertFalse(url.toLowerCase().contains("h2"), "Must not use H2");
        }

        assertEquals("org.postgresql.Driver", environment.getProperty("spring.datasource.driver-class-name"));
    }

    @Test
    void flywayMigrationsApplied() {
        List<Map<String, Object>> history = jdbcTemplate.queryForList(
                "SELECT version, description, success FROM flyway_schema_history ORDER BY installed_rank"
        );

        assertTrue(history.size() >= 8, "Expected at least V1-V8 migrations, got: " + history.size());

        Integer roles = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM roles", Integer.class);
        assertEquals(5, roles);

        Integer adminRole = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM roles WHERE name = 'ADMIN'", Integer.class);
        assertEquals(1, adminRole);

        Integer legacyAdmin = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM roles WHERE name = 'ROLE_ADMIN'", Integer.class);
        assertEquals(0, legacyAdmin);

        Integer tables = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM information_schema.tables "
                        + "WHERE table_schema = 'public' AND table_name = 'work_order_attachments'",
                Integer.class);
        assertEquals(1, tables);

        Integer serviceNumberCol = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM information_schema.columns "
                        + "WHERE table_schema = 'public' AND table_name = 'work_orders' "
                        + "AND column_name = 'service_number'",
                Integer.class);
        assertEquals(1, serviceNumberCol);
    }

    @Test
    void seedBrandsAndModelsPresentAndIdempotent() {
        Integer brandCount = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM brands WHERE name IN ('Apple','Samsung','Lenovo','HP')",
                Integer.class);
        assertEquals(4, brandCount);

        Integer modelCount = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM device_models dm "
                        + "JOIN brands b ON b.id = dm.brand_id "
                        + "WHERE (b.name = 'Apple' AND dm.name = 'MacBook Air') "
                        + "   OR (b.name = 'Samsung' AND dm.name = 'Galaxy Book') "
                        + "   OR (b.name = 'Lenovo' AND dm.name = 'ThinkPad') "
                        + "   OR (b.name = 'HP' AND dm.name = 'ProBook')",
                Integer.class);
        assertEquals(4, modelCount);

        // V5 idempotent INSERT'lerini tekrar çalıştır — duplicate üretmemeli
        jdbcTemplate.execute("""
                INSERT INTO brands (name, description, is_active)
                SELECT 'Apple', 'Seed marka', TRUE
                WHERE NOT EXISTS (SELECT 1 FROM brands WHERE lower(name) = lower('Apple'))
                """);
        jdbcTemplate.execute("""
                INSERT INTO device_models (
                    brand_id, name, device_type,
                    general_warranty_months, parts_warranty_months, labor_warranty_months, is_active
                )
                SELECT b.id, 'MacBook Air', 'LAPTOP', 24, 12, 12, TRUE
                FROM brands b
                WHERE lower(b.name) = lower('Apple')
                  AND NOT EXISTS (
                      SELECT 1 FROM device_models m
                      WHERE m.brand_id = b.id AND lower(m.name) = lower('MacBook Air')
                  )
                """);

        Integer brandCountAfter = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM brands WHERE lower(name) = lower('Apple')", Integer.class);
        assertEquals(1, brandCountAfter);

        Integer modelCountAfter = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM device_models dm "
                        + "JOIN brands b ON b.id = dm.brand_id "
                        + "WHERE lower(b.name) = lower('Apple') AND lower(dm.name) = lower('MacBook Air')",
                Integer.class);
        assertEquals(1, modelCountAfter);
    }

    @Test
    void activityLogsTableExists() {
        Integer count = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM information_schema.tables "
                        + "WHERE table_schema = 'public' AND table_name = 'activity_logs'",
                Integer.class);
        assertEquals(1, count);
    }

    @Test
    void notificationDedupAndBotLogColumnsExist() {
        Integer dedup = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM information_schema.tables "
                        + "WHERE table_schema = 'public' AND table_name = 'notification_dedup'",
                Integer.class);
        assertEquals(1, dedup);

        Integer extCol = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM information_schema.columns "
                        + "WHERE table_schema = 'public' AND table_name = 'bot_interaction_logs' "
                        + "AND column_name = 'external_message_id'",
                Integer.class);
        assertEquals(1, extCol);
    }

    @Test
    void notificationsAndOutboxTablesExist() {
        Integer notifications = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM information_schema.tables "
                        + "WHERE table_schema = 'public' AND table_name = 'notifications'",
                Integer.class);
        assertEquals(1, notifications);

        Integer outbox = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM information_schema.tables "
                        + "WHERE table_schema = 'public' AND table_name = 'whatsapp_outbox'",
                Integer.class);
        assertEquals(1, outbox);
    }
}
