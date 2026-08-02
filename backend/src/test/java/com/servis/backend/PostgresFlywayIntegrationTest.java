package com.servis.backend;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.core.env.Environment;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.DatabaseMetaData;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

@SpringBootTest
class PostgresFlywayIntegrationTest {

    @DynamicPropertySource
    static void registerDatasource(DynamicPropertyRegistry registry) {

        // Railway PostgreSQL
        registry.add(
                "spring.datasource.url",
                () -> "jdbc:postgresql://tokaido.proxy.rlwy.net:20845/railway"
        );

        registry.add(
                "spring.datasource.username",
                () -> "postgres"
        );

        registry.add(
                "spring.datasource.password",
                () -> "TqLeKUMYImzrdFKwDgYJTotvtqOBydYx"
        );

        registry.add(
                "spring.datasource.driver-class-name",
                () -> "org.postgresql.Driver"
        );

        // Hibernate sadece kontrol etsin, tablo oluşturmasın
        registry.add(
                "spring.jpa.hibernate.ddl-auto",
                () -> "validate"
        );

        // Flyway migrationları çalışsın
        registry.add(
                "spring.flyway.enabled",
                () -> "true"
        );

        registry.add(
                "spring.flyway.locations",
                () -> "classpath:db/migration"
        );

        // H2 veya başka test DB'si kullanılmasın
        registry.add(
                "spring.test.database.replace",
                () -> "none"
        );
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

            assertTrue(
                    product.toLowerCase().contains("postgresql"),
                    "Expected PostgreSQL, got: " + product
            );

            assertTrue(
                    url.startsWith("jdbc:postgresql:"),
                    "Expected PostgreSQL JDBC URL, got: " + url
            );

            assertFalse(
                    url.toLowerCase().contains("h2"),
                    "Must not use H2"
            );
        }

        assertEquals(
                "org.postgresql.Driver",
                environment.getProperty("spring.datasource.driver-class-name")
        );
    }

    @Test
    void flywayMigrationsApplied() {

        List<Map<String, Object>> history =
                jdbcTemplate.queryForList(
                        "SELECT version, description, success " +
                        "FROM flyway_schema_history " +
                        "ORDER BY installed_rank"
                );

        assertTrue(
                history.size() >= 4,
                "Expected at least V1-V4 migrations, got: " + history.size()
        );

        Integer roles =
                jdbcTemplate.queryForObject(
                        "SELECT COUNT(*) FROM roles",
                        Integer.class
                );

        assertEquals(5, roles);

        Integer adminRole =
                jdbcTemplate.queryForObject(
                        "SELECT COUNT(*) FROM roles WHERE name = 'ADMIN'",
                        Integer.class
                );

        assertEquals(1, adminRole);

        Integer legacyAdmin =
                jdbcTemplate.queryForObject(
                        "SELECT COUNT(*) FROM roles WHERE name = 'ROLE_ADMIN'",
                        Integer.class
                );

        assertEquals(0, legacyAdmin);

        Integer tables =
                jdbcTemplate.queryForObject(
                        "SELECT COUNT(*) " +
                        "FROM information_schema.tables " +
                        "WHERE table_schema = 'public' " +
                        "AND table_name = 'work_order_attachments'",
                        Integer.class
                );

        assertEquals(1, tables);
    }

    @Test
    void activityLogsTableExists() {

        Integer count =
                jdbcTemplate.queryForObject(
                        "SELECT COUNT(*) " +
                        "FROM information_schema.tables " +
                        "WHERE table_schema = 'public' " +
                        "AND table_name = 'activity_logs'",
                        Integer.class
                );

        assertEquals(1, count);
    }
}