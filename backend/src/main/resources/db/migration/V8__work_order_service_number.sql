-- Servis numarası (müşteri referansı). Format: SRV-YYYY-XXXXXX

CREATE SEQUENCE IF NOT EXISTS work_order_service_seq START WITH 1 INCREMENT BY 1;

ALTER TABLE work_orders
    ADD COLUMN IF NOT EXISTS service_number VARCHAR(32);

-- Mevcut kayıtları created_at yılı + id ile backfill et
UPDATE work_orders
SET service_number = 'SRV-'
    || COALESCE(EXTRACT(YEAR FROM created_at)::INT, EXTRACT(YEAR FROM CURRENT_DATE)::INT)
    || '-'
    || LPAD(id::TEXT, 6, '0')
WHERE service_number IS NULL;

-- Sequence'i mevcut id'lerin ötesine al (yeni üretim çakışmasın)
SELECT setval(
    'work_order_service_seq',
    GREATEST(
        (SELECT COALESCE(MAX(id), 1) FROM work_orders),
        1
    )
);

ALTER TABLE work_orders
    ALTER COLUMN service_number SET NOT NULL;

ALTER TABLE work_orders
    DROP CONSTRAINT IF EXISTS uq_work_orders_service_number;

ALTER TABLE work_orders
    ADD CONSTRAINT uq_work_orders_service_number UNIQUE (service_number);

CREATE INDEX IF NOT EXISTS idx_work_orders_service_number ON work_orders (service_number);
