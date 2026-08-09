"use client";

import Link from "next/link";
import {
  Activity,
  Bell,
  CheckCircle2,
  ClipboardList,
  MessageSquare,
  Users,
} from "lucide-react";

export function LandingHero() {
  return (
    <section
      id="ust"
      className="relative overflow-hidden border-b border-slate-200/80 bg-gradient-to-b from-white via-slate-50 to-surface"
    >
      <div className="pointer-events-none absolute inset-0 landing-hero-glow" aria-hidden />
      <div className="relative mx-auto grid max-w-6xl gap-12 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:items-center lg:gap-10 lg:px-8 lg:py-24">
        <div className="landing-hero-copy">
          <p className="mb-4 inline-flex items-center rounded-full border border-accent/20 bg-accent-soft px-3 py-1 text-xs font-medium text-accent-strong">
            Kurumsal servis yönetim platformu
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-navy sm:text-4xl lg:text-[2.75rem] lg:leading-[1.15]">
            Servis Operasyonlarınızı
            <span className="block text-accent-strong">Tek Bir Panelden Yönetin</span>
          </h1>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-slate-600 sm:text-lg">
            Müşteri, cihaz, iş emri, teknisyen, garanti ve WhatsApp bildirimlerini tek bir
            modern sistemde yönetin.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a
              href="#onizleme"
              className="inline-flex h-11 items-center rounded-xl bg-navy px-5 text-sm font-medium text-white transition hover:bg-navy-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
            >
              Paneli Keşfet
            </a>
            <Link
              href="/login"
              className="inline-flex h-11 items-center rounded-xl border border-slate-200 bg-white px-5 text-sm font-medium text-navy shadow-soft transition hover:border-slate-300 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
            >
              Giriş Yap
            </Link>
          </div>
        </div>

        {/* Dashboard mockup */}
        <div className="relative landing-hero-visual mx-auto w-full max-w-lg lg:max-w-none">
          <div className="absolute -inset-4 rounded-[2rem] bg-gradient-to-br from-accent/20 via-transparent to-navy/10 blur-2xl" aria-hidden />
          <div className="relative rounded-2xl border border-slate-200/90 bg-white/90 p-4 shadow-elevated backdrop-blur-sm sm:p-5">
            <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-red-300" />
                <span className="h-2.5 w-2.5 rounded-full bg-amber-300" />
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-300" />
              </div>
              <span className="text-xs font-medium text-slate-400">Operasyon paneli</span>
            </div>

            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
              <MockKpi
                icon={<ClipboardList className="h-4 w-4 text-accent-strong" />}
                label="Açık İş Emri"
                value="24"
                className="landing-float-a"
              />
              <MockKpi
                icon={<CheckCircle2 className="h-4 w-4 text-emerald-600" />}
                label="Teslime Hazır"
                value="7"
                className="landing-float-b"
              />
              <MockKpi
                icon={<Users className="h-4 w-4 text-navy" />}
                label="Aktif Teknisyen"
                value="12"
                className="landing-float-c col-span-2 sm:col-span-1"
              />
            </div>

            <div className="mt-3 space-y-2 rounded-xl border border-slate-100 bg-slate-50/80 p-3">
              <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                Son iş emirleri
              </p>
              <MockRow
                code="SRV-2026-000021"
                status="İşlemde"
                tone="info"
              />
              <MockRow
                code="SRV-2026-000018"
                status="Teslime Hazır"
                tone="success"
              />
              <MockRow
                code="SRV-2026-000015"
                status="Teknisyen Atandı"
                tone="neutral"
              />
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2">
              <div className="landing-float-d flex items-center gap-2 rounded-xl border border-slate-100 bg-white px-3 py-2.5 shadow-soft">
                <MessageSquare className="h-4 w-4 text-accent" />
                <div>
                  <p className="text-[11px] text-slate-400">WhatsApp</p>
                  <p className="text-xs font-medium text-navy">Bildirim gönderildi</p>
                </div>
              </div>
              <div className="landing-float-e flex items-center gap-2 rounded-xl border border-slate-100 bg-white px-3 py-2.5 shadow-soft">
                <Bell className="h-4 w-4 text-amber-500" />
                <div>
                  <p className="text-[11px] text-slate-400">Bildirim</p>
                  <p className="text-xs font-medium text-navy">Yeni atama</p>
                </div>
              </div>
            </div>

            <div className="landing-float-f pointer-events-none absolute -right-3 top-16 hidden rounded-xl border border-white/60 bg-navy px-3 py-2 text-xs text-white shadow-elevated sm:block">
              <div className="flex items-center gap-2">
                <Activity className="h-3.5 w-3.5 text-accent" />
                Canlı lifecycle
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function MockKpi({
  icon,
  label,
  value,
  className,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div
      className={`rounded-xl border border-slate-100 bg-white p-3 shadow-soft ${className ?? ""}`}
    >
      <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-slate-50">
        {icon}
      </div>
      <p className="text-[11px] text-slate-400">{label}</p>
      <p className="text-lg font-semibold tabular-nums text-navy">{value}</p>
    </div>
  );
}

function MockRow({
  code,
  status,
  tone,
}: {
  code: string;
  status: string;
  tone: "info" | "success" | "neutral";
}) {
  const toneClass =
    tone === "success"
      ? "bg-emerald-50 text-emerald-700"
      : tone === "info"
        ? "bg-sky-50 text-sky-700"
        : "bg-slate-100 text-slate-600";
  return (
    <div className="flex items-center justify-between gap-2 rounded-lg bg-white px-2.5 py-2">
      <span className="font-mono text-xs text-slate-600">{code}</span>
      <span className={`rounded-md px-2 py-0.5 text-[10px] font-medium ${toneClass}`}>
        {status}
      </span>
    </div>
  );
}
