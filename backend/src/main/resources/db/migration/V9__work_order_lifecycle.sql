-- P1: Servis yaşam döngüsü alanları

ALTER TABLE work_orders
    ADD COLUMN IF NOT EXISTS estimated_completion_at TIMESTAMP;

ALTER TABLE work_orders
    ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMP;

ALTER TABLE work_orders
    ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMP;

ALTER TABLE work_orders
    ADD COLUMN IF NOT EXISTS customer_notified_at TIMESTAMP;

ALTER TABLE work_orders
    ADD COLUMN IF NOT EXISTS delivery_note TEXT;

ALTER TABLE work_orders
    ADD COLUMN IF NOT EXISTS resolution_note TEXT;

ALTER TABLE work_orders
    ADD COLUMN IF NOT EXISTS cancellation_reason VARCHAR(500);

ALTER TABLE work_orders
    ADD COLUMN IF NOT EXISTS last_notification_status VARCHAR(30);

ALTER TABLE work_orders
    ADD COLUMN IF NOT EXISTS last_whatsapp_message_id VARCHAR(100);

ALTER TABLE work_orders
    ADD COLUMN IF NOT EXISTS customer_notification_count INT NOT NULL DEFAULT 0;

-- Eski completed_at → resolved_at backfill
UPDATE work_orders
SET resolved_at = completed_at
WHERE resolved_at IS NULL AND completed_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_work_orders_resolved_at ON work_orders (resolved_at);
CREATE INDEX IF NOT EXISTS idx_work_orders_delivered_at ON work_orders (delivered_at);
CREATE INDEX IF NOT EXISTS idx_work_orders_estimated_completion_at ON work_orders (estimated_completion_at);
