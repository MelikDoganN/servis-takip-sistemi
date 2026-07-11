# Frontend - Next.js (K2)

Servis Takip Sistemi yönetim paneli.

## Teknolojiler

- Next.js 15 (App Router)
- TypeScript
- Tailwind CSS

## Kurulum

```bash
cd frontend
npm install
npm run dev
```

Uygulama `http://localhost:3000` adresinde çalışır.

## Sayfalar

| Rota | Sayfa |
|------|-------|
| `/login` | Giriş ekranı |
| `/dashboard` | Dashboard (KPI kartları) |
| `/musteriler` | Müşteri yönetimi |
| `/cihazlar` | Cihaz yönetimi |
| `/is-emirleri` | İş emirleri |
| `/garanti-sorgulama` | Garanti sorgulama |
| `/raporlar` | Raporlar |
| `/kullanici-yonetimi` | Kullanıcı yönetimi |

## Dosya Yapısı

```
src/
├── app/
│   ├── (dashboard)/        # Admin panel sayfaları
│   ├── login/              # Giriş sayfası
│   ├── globals.css
│   └── layout.tsx
├── components/
│   ├── layout/             # Sidebar, Header, DashboardLayout
│   └── ui/                 # Button, Input, Card, Table, Modal
├── config/
│   └── navigation.ts       # Sidebar menü tanımları
└── lib/
    └── utils.ts
```
