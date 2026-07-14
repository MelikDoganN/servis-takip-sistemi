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
  AlertTriangle,
} from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { KpiCard } from "@/components/ui/KpiCard";
import { ChartPlaceholder } from "@/components/ui/ChartPlaceholder";
import { SectionCard } from "@/components/ui/SectionCard";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { EmptyState } from "@/components/ui/EmptyState";
import { SkeletonCard, SkeletonList } from "@/components/ui/Skeleton";
import { dashboardService } from "@/services/dashboardService";
import { DashboardStats } from "@/types/dashboard";
import { ApiError } from "@/types/api";

const quickLinks = [
  { href: "/musteriler", label: "Müşteriler", icon: Users },
  { href: "/cihazlar", label: "Cihazlar", icon: MonitorSmartphone },
  { href: "/garanti-sorgulama", label: "Garanti", icon: ShieldCheck },
  { href: "/is-emirleri", label: "İş Emirleri", icon: ClipboardList },
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
      <div className="space-y-6 sm:space-y-8">
        <div className="space-y-2">
          <div className="skeleton h-8 w-48" />
          <div className="skeleton h-4 w-72" />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:gap-5">
          <SkeletonCard />
          <SkeletonCard />
        </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-5">
          <SkeletonCard />
          <SkeletonCard />
        </div>
        <SkeletonList />
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      <PageHeader
        title="Dashboard"
        description="Operasyonel özet ve performans göstergeleri"
        icon={<LayoutDashboard className="h-5 w-5" />}
      />

      {error && <ErrorMessage message={error} />}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:gap-5">
        <KpiCard
          label="Toplam Müşteri"
          value={stats?.totalCustomers ?? 0}
          description="Kayıtlı müşteri sayısı"
          iconBg="bg-primary-50 text-primary-600"
          icon={<Users className="h-6 w-6" />}
        />
        <KpiCard
          label="Toplam Cihaz"
          value={stats?.totalDevices ?? 0}
          description="Envanterdeki cihaz sayısı"
          iconBg="bg-emerald-50 text-emerald-600"
          icon={<MonitorSmartphone className="h-6 w-6" />}
        />
      </div>

      <SectionCard title="Hızlı İşlemler" description="Sık kullanılan modüllere geçiş">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {quickLinks.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="group flex items-center justify-between rounded-xl border border-slate-200 bg-gradient-to-b from-white to-slate-50/80 px-4 py-3 shadow-soft transition-all duration-200 hover:-translate-y-0.5 hover:border-primary-200 hover:shadow-card"
            >
              <div className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-50 text-primary-600">
                  <item.icon className="h-4 w-4" />
                </span>
                <span className="text-sm font-medium text-slate-800">{item.label}</span>
              </div>
              <ArrowRight className="h-4 w-4 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-primary-500" />
            </Link>
          ))}
        </div>
      </SectionCard>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-5">
        <ChartPlaceholder title="Aylık İş Emri Trendi" />
        <ChartPlaceholder title="Servis Tamamlanma Oranı" />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 lg:gap-5">
        <SectionCard title="Son Aktiviteler" description="Sistemdeki son hareketler">
          <EmptyState
            title="Veri yok"
            description="Bu modül backend API'si tamamlandığında aktif olacaktır"
          />
        </SectionCard>

        <SectionCard title="Yaklaşan Teslimatlar" description="Parça ve cihaz teslim takibi">
          <EmptyState
            title="Veri yok"
            description="Bu modül backend API'si tamamlandığında aktif olacaktır"
          />
        </SectionCard>

        <SectionCard title="Kritik Durumlar" description="Acil müdahale gerektiren kayıtlar">
          <EmptyState
            title="Veri yok"
            description="Bu modül backend API'si tamamlandığında aktif olacaktır"
            icon={<AlertTriangle className="h-7 w-7 text-amber-500" strokeWidth={1.5} />}
          />
        </SectionCard>
      </div>
    </div>
  );
}
