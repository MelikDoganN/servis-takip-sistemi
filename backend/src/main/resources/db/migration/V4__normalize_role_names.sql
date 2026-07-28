-- Mevcut ROLE_ önekli kayıtları standart isimlere çevir (idempotent)
UPDATE roles SET name = 'ADMIN' WHERE name = 'ROLE_ADMIN';
UPDATE roles SET name = 'REGION_MANAGER' WHERE name = 'ROLE_REGION_MANAGER';
UPDATE roles SET name = 'CENTER_OPERATOR' WHERE name = 'ROLE_CENTER_OPERATOR';
UPDATE roles SET name = 'TECHNICIAN' WHERE name = 'ROLE_TECHNICIAN';
UPDATE roles SET name = 'CUSTOMER' WHERE name = 'ROLE_CUSTOMER';
