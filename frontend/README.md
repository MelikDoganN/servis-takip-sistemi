# Frontend - Next.js (K2)

Servis Takip Sistemi yönetim paneli.

## Kurulum

```bash
cd frontend
cp .env.local.example .env.local
npm install
npm run dev
```

## Ortam Değişkenleri

```
NEXT_PUBLIC_API_URL=http://localhost:8080
```

## Backend Entegrasyonu (Mevcut)

| Servis | Endpoint |
|--------|----------|
| Müşteri listele | GET /api/customers |
| Müşteri oluştur | POST /api/customers |
| Cihaz listele | GET /api/devices |
| Cihaz oluştur | POST /api/devices |
| Garanti kontrol | GET /api/warranty/check/{deviceId}/{type} |
| Garanti oluştur | POST /api/warranty/generate/{deviceId}/{type} |
| Dashboard | GET /api/customers + GET /api/devices |

## Bekleyen Entegrasyonlar

- Auth (login) — AuthController yok
- İş Emirleri — WorkOrder controller yok
- Raporlar — Report endpoint yok
- Kullanıcı Yönetimi — User API yok
