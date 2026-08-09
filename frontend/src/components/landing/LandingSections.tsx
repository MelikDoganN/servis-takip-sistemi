"use client";

import Link from "next/link";
import {
  BarChart3,
  Bell,
  ClipboardList,
  History,
  MessageCircle,
  MonitorSmartphone,
  ShieldCheck,
  Users,
  Wrench,
} from "lucide-react";
import { Reveal } from "./Reveal";

const FEATURES = [
  {
    icon: ClipboardList,
    title: "İş Emri Yönetimi",
    points: [
      "İnsan okunabilir servis numarası",
      "Durum takibi ve lifecycle alanları",
      "Teknisyen atama ve durum geçişleri",
    ],
  },
  {
    icon: Users,
    title: "Müşteri Yönetimi",
    points: ["Müşteri kayıtları", "Cihaz ilişkisi", "Servis geçmişi"],
  },
  {
    icon: MonitorSmartphone,
    title: "Cihaz Yönetimi",
    points: ["Marka / model", "Seri numarası", "Müşteriye bağlı cihazlar"],
  },
  {
    icon: Wrench,
    title: "Teknisyen Yönetimi",
    points: ["Teknisyen atama", "İş yükü takibi", "Performans ve WhatsApp bildirimi"],
  },
  {
    icon: MessageCircle,
    title: "WhatsApp Entegrasyonu",
    points: [
      "Müşteri botu ve durum sorgulama",
      "Garanti sorgulama",
      "Otomatik durum mesajları ve teknisyen bildirimleri",
    ],
  },
  {
    icon: ShieldCheck,
    title: "Garanti Yönetimi",
    points: ["Seri numarasıyla sorgu", "Başlangıç / bitiş tarihleri", "Cihaz ilişkisi"],
  },
  {
    icon: BarChart3,
    title: "Raporlama",
    points: ["İş emri raporları", "Teknisyen performansı", "PDF çıktıları"],
  },
  {
    icon: History,
    title: "Hareket Geçmişi",
    points: ["Kim / ne zaman", "Hangi işlem", "Denetim (audit) kayıtları"],
  },
  {
    icon: Bell,
    title: "Bildirim Merkezi",
    points: ["Sistem içi bildirimler", "WhatsApp outbox", "Yeniden deneme (retry)"],
  },
];

const STEPS = [
  {
    step: "01",
    title: "Müşteriyi ve cihazı kaydet",
    text: "Müşteri bilgileriyle cihazı marka, model ve seri numarasıyla ilişkilendirin.",
  },
  {
    step: "02",
    title: "İş emri oluştur",
    text: "Servis numarası otomatik oluşur; öncelik ve servis tipiyle kaydı başlatın.",
  },
  {
    step: "03",
    title: "Teknisyeni ata ve süreci takip et",
    text: "Uygun teknisyeni yönlendirin; durum geçişlerini panelden izleyin.",
  },
  {
    step: "04",
    title: "Müşteriyi WhatsApp ile bilgilendir",
    text: "Durum değişikliklerinde otomatik mesajlar gitsin; outbox ile güvenilir teslimat.",
  },
];

const LIFECYCLE = [
  "Açık",
  "Teknisyen Atandı",
  "İşlemde",
  "Parça Bekliyor",
  "Teknik İşlem Tamamlandı",
  "Teslime Hazır",
  "Teslim Edildi",
  "Kapatıldı",
];

const MODULES = [
  "Dashboard",
  "Müşteriler",
  "Cihazlar",
  "İş Emirleri",
  "Teknisyenler",
  "Garanti",
  "Raporlar",
  "WhatsApp İşlemleri",
  "Hareket Geçmişi",
];

export function LandingFeatures() {
  return (
    <section id="ozellikler" className="scroll-mt-20 py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <Reveal>
          <SectionHeading
            eyebrow="Özellikler"
            title="Servis operasyonunun tamamı tek panelde"
            subtitle="Mevcut sistemdeki gerçek modüller — sahte özellik eklenmez."
          />
        </Reveal>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f, i) => (
            <Reveal key={f.title} delayMs={i * 40}>
              <article className="group h-full rounded-2xl border border-slate-200/90 bg-white p-5 shadow-card transition duration-200 hover:-translate-y-0.5 hover:shadow-elevated">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-accent-soft text-accent-strong transition group-hover:bg-navy group-hover:text-white">
                  <f.icon className="h-5 w-5" aria-hidden />
                </div>
                <h3 className="text-base font-semibold text-navy">{f.title}</h3>
                <ul className="mt-3 space-y-1.5">
                  {f.points.map((p) => (
                    <li key={p} className="flex gap-2 text-sm text-slate-600">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                      {p}
                    </li>
                  ))}
                </ul>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

export function LandingHowItWorks() {
  return (
    <section id="nasil-calisir" className="scroll-mt-20 border-y border-slate-200/80 bg-white py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <Reveal>
          <SectionHeading
            eyebrow="Nasıl Çalışır"
            title="Dört adımda uçtan uca servis süreci"
            subtitle="Kayıttan müşteri bilgilendirmesine kadar net bir akış."
          />
        </Reveal>
        <div className="relative mt-12 grid gap-6 lg:grid-cols-4">
          <div
            className="pointer-events-none absolute left-[12%] right-[12%] top-8 hidden h-px bg-gradient-to-r from-transparent via-accent/40 to-transparent lg:block"
            aria-hidden
          />
          {STEPS.map((s, i) => (
            <Reveal key={s.step} delayMs={i * 60}>
              <div className="relative rounded-2xl border border-slate-200 bg-surface/60 p-5">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-navy text-sm font-semibold text-white shadow-soft">
                  {s.step}
                </span>
                <h3 className="mt-4 text-base font-semibold text-navy">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{s.text}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

export function LandingLifecycle() {
  return (
    <section className="py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <Reveal>
          <SectionHeading
            eyebrow="İş Emri Yaşam Döngüsü"
            title="Durum geçişlerini net görün"
            subtitle="Panel ve WhatsApp üzerinden aynı lifecycle takip edilir."
          />
        </Reveal>
        <Reveal delayMs={80}>
          <div className="mt-10 overflow-x-auto pb-2">
            <ol className="flex min-w-max items-center gap-2 sm:min-w-0 sm:flex-wrap sm:justify-center">
              {LIFECYCLE.map((label, i) => (
                <li key={label} className="flex items-center gap-2">
                  <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-navy shadow-soft">
                    <span className="mr-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-accent-soft text-[10px] font-semibold text-accent-strong">
                      {i + 1}
                    </span>
                    {label}
                  </span>
                  {i < LIFECYCLE.length - 1 && (
                    <span className="text-slate-300" aria-hidden>
                      →
                    </span>
                  )}
                </li>
              ))}
            </ol>
          </div>
          <p className="mt-4 text-center text-sm text-slate-500">
            Alternatif durum:{" "}
            <span className="rounded-md bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700">
              İptal Edildi
            </span>
          </p>
        </Reveal>
      </div>
    </section>
  );
}

export function LandingWhatsApp() {
  return (
    <section id="whatsapp" className="scroll-mt-20 border-y border-slate-200/80 bg-navy-deep py-16 text-white sm:py-20">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 sm:px-6 lg:grid-cols-2 lg:items-center lg:px-8">
        <Reveal>
          <div className="relative mx-auto w-full max-w-sm">
            <div className="rounded-[1.75rem] border border-white/10 bg-gradient-to-b from-white/10 to-white/5 p-3 shadow-elevated backdrop-blur-sm">
              <div className="rounded-[1.35rem] bg-[#0b141a] p-4">
                <div className="mb-4 flex items-center gap-3 border-b border-white/10 pb-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-accent/30">
                    <MessageCircle className="h-4 w-4 text-accent" />
                  </span>
                  <div>
                    <p className="text-sm font-medium">Servis Bildirimi</p>
                    <p className="text-[11px] text-white/50">Otomatik mesaj</p>
                  </div>
                </div>
                <div className="space-y-3">
                  <ChatBubble>
                    🎉 Cihazınız Teslime Hazır
                    <br />
                    Servis No: SRV-2026-000021
                  </ChatBubble>
                  <ChatBubble dim>
                    Teknisyen atandı. Cihazınız üzerinde işlemler başladı.
                  </ChatBubble>
                  <ChatBubble>
                    Menü: Servislerim · Garanti Sorgula · Servis No ile durum
                  </ChatBubble>
                </div>
              </div>
            </div>
          </div>
        </Reveal>
        <Reveal delayMs={100}>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-accent">WhatsApp</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
              Müşteriniz cihazının durumunu WhatsApp&apos;tan takip etsin.
            </h2>
            <ul className="mt-6 space-y-3 text-sm text-slate-300">
              {[
                "Müşteri botu: Servislerim, Garanti Sorgula, Servis No ile durum",
                "Otomatik durum mesajları (lifecycle)",
                "Teknisyene yeni iş bildirimi",
                "Teknisyenin WhatsApp'tan durum güncellemesi",
                "Outbox + retry ile güvenilir teslimat",
              ].map((item) => (
                <li key={item} className="flex gap-3">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

export function LandingDashboardPreview() {
  return (
    <section id="onizleme" className="scroll-mt-20 py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <Reveal>
          <SectionHeading
            eyebrow="Uygulama Önizlemesi"
            title="Yönetim paneli modülleri"
            subtitle="Giriş sonrası erişebileceğiniz gerçek ekranlar."
          />
        </Reveal>
        <Reveal delayMs={60}>
          <div className="mt-10 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-elevated">
            <div className="flex flex-col sm:flex-row">
              <aside className="border-b border-slate-100 bg-navy-deep p-4 text-white sm:w-52 sm:border-b-0 sm:border-r sm:border-white/10">
                <p className="mb-3 text-[11px] font-medium uppercase tracking-wide text-white/40">
                  Modüller
                </p>
                <ul className="space-y-1">
                  {MODULES.map((m, i) => (
                    <li
                      key={m}
                      className={`rounded-lg px-2.5 py-1.5 text-xs ${
                        i === 0 ? "bg-accent/20 text-white" : "text-white/70"
                      }`}
                    >
                      {m}
                    </li>
                  ))}
                </ul>
              </aside>
              <div className="flex-1 p-4 sm:p-6">
                <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
                  {[
                    ["Açık", "18"],
                    ["İşlemde", "9"],
                    ["Teslime Hazır", "5"],
                    ["Bugün Kapanan", "3"],
                  ].map(([l, v]) => (
                    <div key={l} className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                      <p className="text-[11px] text-slate-400">{l}</p>
                      <p className="text-xl font-semibold tabular-nums text-navy">{v}</p>
                    </div>
                  ))}
                </div>
                <div className="rounded-xl border border-slate-100 p-3">
                  <p className="mb-2 text-xs font-medium text-slate-500">Örnek iş emri satırı</p>
                  <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                    <span className="font-mono text-slate-700">SRV-2026-000021</span>
                    <span className="rounded-md bg-sky-50 px-2 py-0.5 text-xs font-medium text-sky-700">
                      İşlemde
                    </span>
                    <span className="text-slate-500">Miraç Teknisyen</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

export function LandingTechnicians() {
  return (
    <section id="teknisyen" className="scroll-mt-20 border-y border-slate-200/80 bg-white py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <Reveal>
          <SectionHeading
            eyebrow="Teknisyen Yönetimi"
            title="Doğru işi doğru teknisyene yönlendirin."
            subtitle="İş yükü, bölge ve müsaitlik bilgisiyle atama yapın."
          />
        </Reveal>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            {
              name: "Miraç Teknisyen",
              region: "İstanbul Anadolu",
              load: 4,
              status: "Meşgul",
              perf: "%94",
            },
            {
              name: "Ayşe Servis",
              region: "İstanbul Avrupa",
              load: 2,
              status: "Müsait",
              perf: "%97",
            },
            {
              name: "Can Saha",
              region: "Ankara",
              load: 3,
              status: "Müsait",
              perf: "%91",
            },
          ].map((t, i) => (
            <Reveal key={t.name} delayMs={i * 50}>
              <article className="rounded-2xl border border-slate-200 bg-surface/50 p-5 shadow-card">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-semibold text-navy">{t.name}</h3>
                    <p className="mt-1 text-sm text-slate-500">{t.region}</p>
                  </div>
                  <span
                    className={`rounded-md px-2 py-0.5 text-xs font-medium ${
                      t.status === "Müsait"
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-amber-50 text-amber-700"
                    }`}
                  >
                    {t.status}
                  </span>
                </div>
                <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-lg bg-white p-2 shadow-soft">
                    <dt className="text-[10px] text-slate-400">İş yükü</dt>
                    <dd className="text-sm font-semibold text-navy">{t.load}</dd>
                  </div>
                  <div className="rounded-lg bg-white p-2 shadow-soft">
                    <dt className="text-[10px] text-slate-400">Atanan</dt>
                    <dd className="text-sm font-semibold text-navy">{t.load}</dd>
                  </div>
                  <div className="rounded-lg bg-white p-2 shadow-soft">
                    <dt className="text-[10px] text-slate-400">Performans</dt>
                    <dd className="text-sm font-semibold text-navy">{t.perf}</dd>
                  </div>
                </dl>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

export function LandingReports() {
  return (
    <section id="raporlama" className="scroll-mt-20 py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <Reveal>
          <SectionHeading
            eyebrow="Raporlama"
            title="Performansı ve çıktıları tek yerden alın"
            subtitle="İş emri ve teknisyen raporları, PDF dışa aktarım ile."
          />
        </Reveal>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {[
            { label: "Teknisyen Performansı", value: "%93", bars: [40, 65, 55, 80, 72] },
            { label: "İş Emri Raporu", value: "186", bars: [30, 45, 60, 50, 70] },
            { label: "Başarı Oranı", value: "%89", bars: [50, 55, 60, 68, 75] },
            { label: "Açık İşler", value: "24", bars: [70, 55, 48, 40, 35] },
            { label: "Çözülen İşler", value: "142", bars: [20, 35, 45, 60, 78] },
          ].map((card, i) => (
            <Reveal key={card.label} delayMs={i * 40}>
              <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card">
                <p className="text-xs font-medium text-slate-500">{card.label}</p>
                <p className="mt-1 text-2xl font-semibold tabular-nums text-navy">{card.value}</p>
                <div className="mt-4 flex h-12 items-end gap-1">
                  {card.bars.map((h, idx) => (
                    <span
                      key={idx}
                      className="flex-1 rounded-sm bg-accent/30"
                      style={{ height: `${h}%` }}
                      aria-hidden
                    />
                  ))}
                </div>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

export function LandingAudit() {
  return (
    <section id="guvenlik" className="border-y border-slate-200/80 bg-white py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <Reveal>
          <SectionHeading
            eyebrow="Hareket Geçmişi"
            title="Hangi kullanıcı ne yaptı, ne zaman yaptı?"
            subtitle="Yönetici denetim kayıtlarıyla kritik işlemler izlenir."
          />
        </Reveal>
        <Reveal delayMs={80}>
          <ol className="relative mx-auto mt-10 max-w-2xl space-y-0 border-l border-slate-200 pl-6">
            {[
              {
                time: "10:42",
                who: "Miraç Teknisyen",
                what: "SRV-2026-000021 durumunu İşlemde yaptı.",
              },
              {
                time: "10:35",
                who: "Admin",
                what: "Yeni müşteri oluşturdu.",
              },
              {
                time: "10:34",
                who: "Sistem",
                what: "WhatsApp bildirimi gönderildi.",
              },
            ].map((e) => (
              <li key={e.time + e.who} className="relative pb-8 last:pb-0">
                <span className="absolute -left-[1.65rem] top-1 h-3 w-3 rounded-full border-2 border-accent bg-white" />
                <p className="text-xs font-medium text-accent-strong">{e.time}</p>
                <p className="mt-1 text-sm font-semibold text-navy">{e.who}</p>
                <p className="mt-0.5 text-sm text-slate-600">{e.what}</p>
              </li>
            ))}
          </ol>
        </Reveal>
      </div>
    </section>
  );
}

export function LandingCTA() {
  return (
    <section className="py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <Reveal>
          <div className="relative overflow-hidden rounded-3xl bg-navy px-6 py-12 text-center shadow-elevated sm:px-12">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(18,167,205,0.35),_transparent_55%)]" aria-hidden />
            <h2 className="relative text-2xl font-semibold tracking-tight text-white sm:text-3xl">
              Servis yönetimini daha düzenli hale getirin.
            </h2>
            <p className="relative mx-auto mt-3 max-w-lg text-sm text-slate-300">
              İş emirleri, teknisyenler, garanti ve WhatsApp bildirimlerini tek panelden yönetin.
            </p>
            <Link
              href="/login"
              className="relative mt-8 inline-flex h-11 items-center rounded-xl bg-accent px-6 text-sm font-medium text-white transition hover:bg-accent-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
            >
              Yönetim Paneline Giriş
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

export function LandingFooter() {
  return (
    <footer className="border-t border-slate-200 bg-white py-10">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 sm:px-6 lg:flex-row lg:items-start lg:justify-between lg:px-8">
        <div>
          <p className="text-sm font-semibold text-navy">Servis Takip Sistemi</p>
          <p className="mt-2 max-w-sm text-sm text-slate-500">
            Müşteri, cihaz, iş emri, teknisyen, garanti ve WhatsApp bildirimlerini tek panelden
            yönetin.
          </p>
        </div>
        <nav className="flex flex-wrap gap-x-5 gap-y-2 text-sm" aria-label="Alt menü">
          <a href="#ozellikler" className="text-slate-600 hover:text-navy">
            Özellikler
          </a>
          <a href="#whatsapp" className="text-slate-600 hover:text-navy">
            WhatsApp
          </a>
          <a href="#raporlama" className="text-slate-600 hover:text-navy">
            Raporlama
          </a>
          <Link href="/login" className="text-slate-600 hover:text-navy">
            Giriş Yap
          </Link>
        </nav>
      </div>
      <div className="mx-auto mt-8 max-w-6xl border-t border-slate-100 px-4 pt-6 text-xs text-slate-400 sm:px-6 lg:px-8">
        © 2026 Servis Takip Sistemi
      </div>
    </footer>
  );
}

function SectionHeading({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <p className="text-xs font-medium uppercase tracking-wide text-accent-strong">{eyebrow}</p>
      <h2 className="mt-2 text-2xl font-semibold tracking-tight text-navy sm:text-3xl">{title}</h2>
      <p className="mt-3 text-sm leading-relaxed text-slate-600 sm:text-base">{subtitle}</p>
    </div>
  );
}

function ChatBubble({
  children,
  dim,
}: {
  children: React.ReactNode;
  dim?: boolean;
}) {
  return (
    <div
      className={`max-w-[90%] rounded-2xl rounded-tl-md px-3.5 py-2.5 text-sm leading-relaxed ${
        dim ? "bg-white/5 text-white/70" : "bg-[#005c4b] text-white"
      }`}
    >
      {children}
    </div>
  );
}
