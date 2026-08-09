-- V10: Profesyonel denetim kayıtları (yönetici paneli için kalıcı audit log)

CREATE TABLE IF NOT EXISTS audit_logs (
    id                BIGSERIAL PRIMARY KEY,
    created_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    actor_user_id     BIGINT NULL REFERENCES users(id) ON DELETE SET NULL,
    actor_name        VARCHAR(150) NULL,
    actor_email       VARCHAR(150) NULL,
    actor_role        VARCHAR(50) NULL,
    action            VARCHAR(80) NOT NULL,
    entity_type       VARCHAR(80) NULL,
    entity_id         BIGINT NULL,
    entity_display    VARCHAR(255) NULL,
    description       VARCHAR(500) NOT NULL,
    source            VARCHAR(30) NOT NULL DEFAULT 'SYSTEM',
    ip_address        VARCHAR(64) NULL,
    success           BOOLEAN NOT NULL DEFAULT TRUE,
    metadata_json     TEXT NULL
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs (action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_user ON audit_logs (actor_user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_source ON audit_logs (source);
CREATE INDEX IF NOT EXISTS idx_audit_logs_success ON audit_logs (success);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_display ON audit_logs (entity_display);
