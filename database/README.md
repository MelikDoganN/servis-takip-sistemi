# Database - PostgreSQL (K2)

Servis Takip, Is Takip ve Garanti Yonetim Sistemi icin PostgreSQL sema ve migration dosyalari.

## Tablolar

| Tablo | Aciklama |
|-------|----------|
| roles | RBAC rol tanimlari |
| users | Panel kullanicilari (Admin, Bolge Yoneticisi, Merkez Operatoru) |
| regions | Bolge tanimlari |
| technicians | Saha teknisyenleri, bolge ve is yuku bilgisi |
| customers | Musteri iletisim bilgileri |
| brands | Cihaz markalari |
| device_models | Marka/model ve garanti sureleri |
| devices | Musteriye bagli cihazlar (seri numarasi) |
| warranty_records | Cihaz bazli parca/isçilik garanti kayitlari |
| work_orders | Ariza talepleri ve durum takibi |
| work_order_status_history | Is emri durum degisiklik gecmisi |
| activity_logs | Sistem denetim kayitlari |
| bot_interaction_logs | WhatsApp bot komut ve bildirim kayitlari |

## Iliskiler

- customers 1-n devices
- brands 1-n device_models
- device_models 1-n devices
- devices 1-n warranty_records
- devices 1-n work_orders
- customers 1-n work_orders
- technicians 1-n work_orders (nullable atama)
- work_orders 1-n work_order_status_history
- roles 1-n users
- users 1-1 technicians
- regions 1-n technicians
- regions 1-n work_orders

## Roller (V2)

| Rol | Aciklama |
|-----|----------|
| ROLE_ADMIN | Sistem geneli tam yetki |
| ROLE_REGION_MANAGER | Bolge bazli yonetim |
| ROLE_CENTER_OPERATOR | Musteri/cihaz/ariza kaydi |
| ROLE_TECHNICIAN | Atanan is emirlerini guncelleme |
| ROLE_CUSTOMER | WhatsApp sorgulama |

## Migration Dosyalari

| Dosya | Icerik |
|-------|--------|
| V1__initial_schema.sql | Tum tablolar, foreign key'ler ve indexler |
| V2__seed_roles.sql | 5 sistem rolunun eklenmesi |

## Kurulum

### Docker ile PostgreSQL

```bash
docker run -d \
  --name servis-takip-db \
  -e POSTGRES_DB=servis_takip \
  -e POSTGRES_USER=servis_user \
  -e POSTGRES_PASSWORD=servis_pass \
  -p 5432:5432 \
  postgres:16
```

### Manuel migration (psql)

```bash
psql -h localhost -U servis_user -d servis_takip -f database/migrations/V1__initial_schema.sql
psql -h localhost -U servis_user -d servis_takip -f database/migrations/V2__seed_roles.sql
```

### Flyway ile

Flyway kullanildiginda `database/migrations` klasoru migration kaynagi olarak tanimlanir. Spring Boot entegrasyonu Gun 4 kapsaminda yapilacaktir.

```properties
spring.flyway.locations=classpath:db/migration
spring.flyway.baseline-on-migrate=true
```

## Index Plani

Sik sorgulanan alanlar icin indexler V1 migration'da tanimlanmistir:

- devices.serial_number (unique + index)
- customers.phone
- customers.whatsapp_number
- work_orders.status
- work_orders.region_id

## Is Kurallari (Sema Destegi)

- devices.serial_number unique constraint ile mukerrer kayit engellenir
- work_orders.technician_id nullable; atama oncesi is emri acilabilir
- warranty_records.warranty_type: GENERAL, PARTS, LABOR degerleri icin VARCHAR(30)
- work_orders.status: OPENED, ASSIGNED, WAITING_PARTS, RESOLVED, CLOSED degerleri icin VARCHAR(30)
