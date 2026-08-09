-- V11: Public ürün kataloğu (müşteri cihazlarından / devices'dan ayrı)

CREATE TABLE IF NOT EXISTS product_categories (
    id          BIGSERIAL PRIMARY KEY,
    name        VARCHAR(120) NOT NULL,
    slug        VARCHAR(140) NOT NULL UNIQUE,
    description VARCHAR(500) NULL,
    sort_order  INT NOT NULL DEFAULT 0,
    active      BOOLEAN NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS products (
    id                 BIGSERIAL PRIMARY KEY,
    name               VARCHAR(200) NOT NULL,
    slug               VARCHAR(220) NOT NULL UNIQUE,
    brand              VARCHAR(120) NULL,
    model              VARCHAR(120) NULL,
    category_id        BIGINT NULL REFERENCES product_categories(id) ON DELETE SET NULL,
    short_description  VARCHAR(500) NULL,
    description        TEXT NULL,
    price              NUMERIC(12, 2) NULL,
    currency           VARCHAR(8) NOT NULL DEFAULT 'TRY',
    image_url          VARCHAR(500) NULL,
    active             BOOLEAN NOT NULL DEFAULT TRUE,
    featured           BOOLEAN NOT NULL DEFAULT FALSE,
    stock_status       VARCHAR(30) NOT NULL DEFAULT 'AVAILABLE',
    created_at         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_products_active ON products (active);
CREATE INDEX IF NOT EXISTS idx_products_featured ON products (featured) WHERE active = TRUE;
CREATE INDEX IF NOT EXISTS idx_products_category ON products (category_id);
CREATE INDEX IF NOT EXISTS idx_products_brand ON products (brand);
CREATE INDEX IF NOT EXISTS idx_product_categories_active ON product_categories (active);
