# Database - PostgreSQL Schemas (K2)

Canonical Flyway migrations live in:

`backend/src/main/resources/db/migration/`

Spring Boot / Flyway loads them from `classpath:db/migration`.

This `database/migrations/` folder mirrors those scripts for K2 documentation sync. Prefer editing the backend path and copying here when needed.

## Files
- `V1__initial_schema.sql` – initial schema
- `V2__seed_roles.sql` – seed roles
- `V3__work_order_attachments.sql` – work order attachments