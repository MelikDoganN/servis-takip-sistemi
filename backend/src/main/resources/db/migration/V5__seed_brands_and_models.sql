-- Minimal brand/model seed for device forms (idempotent).

INSERT INTO brands (name, description, is_active)
SELECT 'Apple', 'Seed marka', TRUE
WHERE NOT EXISTS (
    SELECT 1 FROM brands WHERE lower(name) = lower('Apple')
);

INSERT INTO brands (name, description, is_active)
SELECT 'Samsung', 'Seed marka', TRUE
WHERE NOT EXISTS (
    SELECT 1 FROM brands WHERE lower(name) = lower('Samsung')
);

INSERT INTO brands (name, description, is_active)
SELECT 'Lenovo', 'Seed marka', TRUE
WHERE NOT EXISTS (
    SELECT 1 FROM brands WHERE lower(name) = lower('Lenovo')
);

INSERT INTO brands (name, description, is_active)
SELECT 'HP', 'Seed marka', TRUE
WHERE NOT EXISTS (
    SELECT 1 FROM brands WHERE lower(name) = lower('HP')
);

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
  );

INSERT INTO device_models (
    brand_id, name, device_type,
    general_warranty_months, parts_warranty_months, labor_warranty_months, is_active
)
SELECT b.id, 'Galaxy Book', 'LAPTOP', 24, 12, 12, TRUE
FROM brands b
WHERE lower(b.name) = lower('Samsung')
  AND NOT EXISTS (
      SELECT 1 FROM device_models m
      WHERE m.brand_id = b.id AND lower(m.name) = lower('Galaxy Book')
  );

INSERT INTO device_models (
    brand_id, name, device_type,
    general_warranty_months, parts_warranty_months, labor_warranty_months, is_active
)
SELECT b.id, 'ThinkPad', 'LAPTOP', 24, 12, 12, TRUE
FROM brands b
WHERE lower(b.name) = lower('Lenovo')
  AND NOT EXISTS (
      SELECT 1 FROM device_models m
      WHERE m.brand_id = b.id AND lower(m.name) = lower('ThinkPad')
  );

INSERT INTO device_models (
    brand_id, name, device_type,
    general_warranty_months, parts_warranty_months, labor_warranty_months, is_active
)
SELECT b.id, 'ProBook', 'LAPTOP', 24, 12, 12, TRUE
FROM brands b
WHERE lower(b.name) = lower('HP')
  AND NOT EXISTS (
      SELECT 1 FROM device_models m
      WHERE m.brand_id = b.id AND lower(m.name) = lower('ProBook')
  );
