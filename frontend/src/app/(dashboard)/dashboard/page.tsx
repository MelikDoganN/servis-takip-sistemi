"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  LayoutDashboard,
  Users,
  MonitorSmartphone,
  ShieldCheck,
  ClipboardList,
  ArrowRight,
  CircleDot,
  CheckCircle2,
  XCircle,
  Plus,
  BarChart3,
} from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { KpiCard } from "@/components/ui/KpiCard";
import { SectionCard } from "@/components/ui/SectionCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { SkeletonCard } from "@/components/ui/Skeleton";
import { dashboardService } from "@/services/dashboardService";
import { DashboardStats } from "@/types/dashboard";
import { ApiError } from "@/types/api";

const quickLinks = [
  {
    href: "/is-emirleri",
    label: "İş Emri Oluştur",
    description: "Yeni servis kaydı aç",
    icon: Plus,
  },
  {
    href: "/musteriler",
    label: "Müşteriler",
    description: "Müşteri portföyü",
    icon: Users,
  },
  {
    href: "/cihazlar",
    label: "Cihazlar",
    description: "Cihaz envanteri",
    icon: MonitorSmartphone,
  },
  {
    href: "/garanti-sorgulama",
    label: "Garanti Sorgula",
    description: "Seri no ile kontrol",
    icon: ShieldCheck,
  },
];

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await dashboardService.getStats();
      setStats(data);
    } catch (err) {
      const apiErr = err as ApiError;
      setError(apiErr.message || "Veriler yüklenemedi");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  if (loading) {
    return (
      <div className="space-y-5 sm:space-y-6">
        <div className="space-y-2">
          <div className="skeleton h-8 w-48" />
          <div className="skeleton h-4 w-72" />
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 lg:gap-4">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 sm:space-y-6">
      <PageHeader
        title="Dashboard"
        description="Operasyonel özet ve performans göstergeleri"
        icon={<LayoutDashboard className="h-5 w-5" />}
      />

      {error && <ErrorMessage message={error} />}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 lg:gap-4">
        <KpiCard
          label="Toplam Müşteri"
          value={stats?.totalCustomers ?? 0}
          description="Kayıtlı müşteri sayısı"
          iconBg="bg-accent-soft text-accent-strong"
          icon={<Users className="h-5 w-5" />}
        />
        <KpiCard
          label="Toplam Cihaz"
          value={stats?.totalDevices ?? 0}
          description="Envanterdeki cihazlar"
          iconBg="bg-emerald-50 text-emerald-600"
          icon={<MonitorSmartphone className="h-5 w-5" />}
        />
        <KpiCard
          label="Toplam İş Emri"
          value={stats?.totalWorkOrders ?? 0}
          description="Tüm zamanlar"
          iconBg="bg-sky-50 text-sky-600"
          icon={<ClipboardList className="h-5 w-5" />}
        />
        <KpiCard
          label="Açık İş Emri"
          value={stats?.openWorkOrders ?? 0}
          description="Bekleyen / devam eden"
          iconBg="bg-amber-50 text-amber-600"
          icon={<CircleDot className="h-5 w-5" />}
        />
        <KpiCard
          label="Çözülen"
          value={stats?.resolvedWorkOrders ?? 0}
          description="Tamamlanan işler"
          iconBg="bg-teal-50 text-teal-600"
          icon={<CheckCircle2 className="h-5 w-5" />}
        />
        <KpiCard
          label="Kapatılan"
          value={stats?.closedWorkOrders ?? 0}
          description="Kapatılmış kayıtlar"
          iconBg="bg-slate-100 text-slate-600"
          icon={<XCircle className="h-5 w-5" />}
        />
      </div>

      <SectionCard title="Hızlı İşlemler" description="Sık kullanılan işlemlere kısayol">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {quickLinks.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="group flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3.5 py-3 transition-colors hover:border-accent/40 hover:bg-accent-soft/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-navy/5 text-navy group-hover:bg-accent/15 group-hover:text-accent-strong">
                <item.icon className="h-4 w-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium text-navy">{item.label}</span>
                <span className="block text-xs text-slate-400">{item.description}</span>
              </span>
              <ArrowRight className="h-4 w-4 shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-accent" />
            </Link>
          ))}
        </div>
      </SectionCard>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SectionCard
          title="İş Emri Trendleri"
          description="Zaman serisi analizi"
        >
          <EmptyState
            className="py-10"
            icon={<BarChart3 className="h-5 w-5" />}
            title="Bu rapor için henüz yeterli veri bulunmuyor"
            description="Trend grafiği için backend’de zaman serisi endpoint’i henüz bulunmuyor. Detaylı analiz için Raporlar sayfasını kullanın."
            action={
              <Link
                href="/raporlar"
                className="text-sm font-medium text-accent-strong hover:underline"
              >
                Raporlara git
              </Link>
            }
          />
        </SectionCard>
        <SectionCard
          title="Durum Dağılımı"
          description="İş emri durum özeti"
        >
          <EmptyState
            className="py-10"
            icon={<ClipboardList className="h-5 w-5" />}
            title="Bu rapor için henüz yeterli veri bulunmuyor"
            description="Dashboard üzerinde durum dağılımı grafiği için ayrı bir özet API’si yok. Gerçek dağılımı Raporlar sayfasında görebilirsiniz."
            action={
              <Link
                href="/raporlar"
                className="text-sm font-medium text-accent-strong hover:underline"
              >
                Raporlara git
              </Link>
            }
          />
        </SectionCard>
      </div>
    </div>
  );
}
