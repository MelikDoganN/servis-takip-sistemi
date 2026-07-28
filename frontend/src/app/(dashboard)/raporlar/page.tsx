"use client";

import { useCallback, useEffect, useState } from "react";
import {
  BarChart3,
  ClipboardList,
  CircleDot,
  UserCheck,
  Package,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { SectionCard } from "@/components/ui/SectionCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { KpiCard } from "@/components/ui/KpiCard";
import { SkeletonCard } from "@/components/ui/Skeleton";
import {
  reportService,
  WorkOrderSummaryReport,
} from "@/services/reportService";
import { ApiError } from "@/types/api";

export default function RaporlarPage() {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [report, setReport] = useState<WorkOrderSummaryReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchReport = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await reportService.getWorkOrderSummary(
        startDate || undefined,
        endDate || undefined
      );
      setReport(data);
    } catch (err) {
      const apiErr = err as ApiError;
      setError(apiErr.message || "Rapor yüklenemedi");
      setReport(null);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    void fetchReport();
  }, [fetchReport]);

  return (
    <div className="space-y-6 sm:space-y-8">
      <PageHeader
        title="Raporlar"
        description="Operasyonel performans ve servis analizleri"
        icon={<BarChart3 className="h-5 w-5" />}
        action={
          <Button variant="outline" size="sm" onClick={() => void fetchReport()}>
            Yenile
          </Button>
        }
      />

      <SectionCard
        title="Tarih Filtresi"
        description="İsteğe bağlı başlangıç ve bitiş tarihi (yyyy-MM-dd)"
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <Input
              label="Başlangıç"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div className="flex-1">
            <Input
              label="Bitiş"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
          <Button
            type="button"
            onClick={() => {
              setStartDate("");
              setEndDate("");
            }}
            variant="outline"
          >
            Temizle
          </Button>
        </div>
      </SectionCard>

      {error && <ErrorMessage message={error} />}

      <SectionCard title="İş Emri Özeti" description="Duruma göre iş emri sayıları">
        {loading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        ) : !report ? (
          <EmptyState
            title="Rapor verisi yok"
            description="Seçilen tarih aralığında veri bulunamadı"
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <KpiCard
              label="Toplam"
              value={report.total ?? 0}
              description="Tüm iş emirleri"
              iconBg="bg-sky-50 text-sky-600"
              icon={<ClipboardList className="h-6 w-6" />}
            />
            <KpiCard
              label="Açık"
              value={report.open ?? 0}
              description="Açık iş emirleri"
              iconBg="bg-amber-50 text-amber-600"
              icon={<CircleDot className="h-6 w-6" />}
            />
            <KpiCard
              label="Atandı"
              value={report.assigned ?? 0}
              description="Teknisyene atananlar"
              iconBg="bg-primary-50 text-primary-600"
              icon={<UserCheck className="h-6 w-6" />}
            />
            <KpiCard
              label="Parça Bekliyor"
              value={report.waitingParts ?? 0}
              description="Parça bekleyenler"
              iconBg="bg-orange-50 text-orange-600"
              icon={<Package className="h-6 w-6" />}
            />
            <KpiCard
              label="Çözüldü"
              value={report.resolved ?? 0}
              description="Çözülen iş emirleri"
              iconBg="bg-teal-50 text-teal-600"
              icon={<CheckCircle2 className="h-6 w-6" />}
            />
            <KpiCard
              label="Kapalı"
              value={report.closed ?? 0}
              description="Kapatılan iş emirleri"
              iconBg="bg-slate-100 text-slate-600"
              icon={<XCircle className="h-6 w-6" />}
            />
          </div>
        )}
      </SectionCard>
    </div>
  );
}
