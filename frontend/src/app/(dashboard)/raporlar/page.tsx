"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  ClipboardList,
  CircleDot,
  UserCheck,
  Package,
  CheckCircle2,
  XCircle,
  FileDown,
  PieChart,
  ListChecks,
  Wrench,
} from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { SectionCard } from "@/components/ui/SectionCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { KpiCard } from "@/components/ui/KpiCard";
import { SkeletonCard, SkeletonTable } from "@/components/ui/Skeleton";
import { Badge } from "@/components/ui/Badge";
import { Pagination } from "@/components/ui/Pagination";
import { StatusBarChart, StatusBarChartItem } from "@/components/ui/StatusBarChart";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/Table";
import {
  reportService,
  WorkOrderSummaryReport,
} from "@/services/reportService";
import { workOrderService } from "@/services/workOrderService";
import { technicianService } from "@/services/technicianService";
import { ApiError } from "@/types/api";
import {
  WORK_ORDER_STATUS_LABELS,
  WORK_ORDER_STATUSES,
  WorkOrder,
  WorkOrderAttachment,
  WorkOrderStatus,
  WorkOrderStatusHistory,
} from "@/types/workOrder";
import { Technician } from "@/types/technician";
import { formatDateTime } from "@/lib/utils";
import { useToast } from "@/components/ui/Toast";
import { generateWorkOrderReportPdf } from "@/lib/pdfExport";
import { WorkOrderPdfModal } from "@/components/workorders/WorkOrderPdfModal";

const STATUS_BAR_COLORS: Record<WorkOrderStatus, string> = {
  OPEN: "bg-amber-500",
  ASSIGNED: "bg-sky-500",
  IN_PROGRESS: "bg-indigo-500",
  WAITING_PARTS: "bg-orange-500",
  RESOLVED: "bg-teal-500",
  CLOSED: "bg-slate-400",
  CANCELLED: "bg-rose-400",
};

function statusBadgeVariant(
  status: WorkOrderStatus
): "default" | "success" | "warning" | "danger" | "info" | "neutral" {
  switch (status) {
    case "OPEN":
      return "warning";
    case "ASSIGNED":
      return "info";
    case "IN_PROGRESS":
      return "info";
    case "WAITING_PARTS":
      return "default";
    case "RESOLVED":
      return "success";
    case "CLOSED":
      return "neutral";
    case "CANCELLED":
      return "danger";
    default:
      return "neutral";
  }
}

interface TechnicianPerformance {
  id: number;
  name: string;
  region: string;
  total: number;
  open: number;
  resolved: number;
  completionRate: number;
  currentWorkload: number;
  isAvailable: boolean;
}

const DETAIL_PAGE_SIZE_DEFAULT = 10;

export default function RaporlarPage() {
  const toast = useToast();
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [report, setReport] = useState<WorkOrderSummaryReport | null>(null);
  const [reportLoading, setReportLoading] = useState(true);
  const [reportError, setReportError] = useState("");

  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [detailLoading, setDetailLoading] = useState(true);
  const [detailError, setDetailError] = useState("");

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DETAIL_PAGE_SIZE_DEFAULT);

  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedWorkOrder, setSelectedWorkOrder] = useState<WorkOrder | null>(
    null
  );
  const [selectedHistory, setSelectedHistory] = useState<
    WorkOrderStatusHistory[]
  >([]);
  const [selectedAttachments, setSelectedAttachments] = useState<
    WorkOrderAttachment[]
  >([]);
  const [detailModalLoading, setDetailModalLoading] = useState(false);

  const fetchReport = useCallback(async () => {
    setReportLoading(true);
    setReportError("");
    try {
      const data = await reportService.getWorkOrderSummary(
        startDate || undefined,
        endDate || undefined
      );
      setReport(data);
    } catch (err) {
      const apiErr = err as ApiError;
      setReportError(apiErr.message || "Rapor yüklenemedi");
      setReport(null);
    } finally {
      setReportLoading(false);
    }
  }, [startDate, endDate]);

  const fetchDetailData = useCallback(async () => {
    setDetailLoading(true);
    setDetailError("");
    try {
      const [woData, techData] = await Promise.all([
        workOrderService.getAll(1000),
        technicianService.getAll().catch(() => [] as Technician[]),
      ]);
      setWorkOrders(woData);
      setTechnicians(techData);
    } catch (err) {
      const apiErr = err as ApiError;
      setDetailError(apiErr.message || "Detay veriler yüklenemedi");
      setWorkOrders([]);
    } finally {
      setDetailLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchReport();
  }, [fetchReport]);

  useEffect(() => {
    void fetchDetailData();
  }, [fetchDetailData]);

  const filteredWorkOrders = useMemo(() => {
    if (!startDate && !endDate) return workOrders;
    const start = startDate ? new Date(`${startDate}T00:00:00`).getTime() : null;
    const end = endDate ? new Date(`${endDate}T23:59:59.999`).getTime() : null;
    return workOrders.filter((wo) => {
      const created = new Date(wo.createdAt).getTime();
      if (Number.isNaN(created)) return true;
      if (start !== null && created < start) return false;
      if (end !== null && created > end) return false;
      return true;
    });
  }, [workOrders, startDate, endDate]);

  useEffect(() => {
    setPage(1);
  }, [startDate, endDate, pageSize]);

  const statusBreakdown = useMemo<StatusBarChartItem[]>(() => {
    return WORK_ORDER_STATUSES.map((status) => ({
      label: WORK_ORDER_STATUS_LABELS[status],
      value: filteredWorkOrders.filter((wo) => wo.status === status).length,
      colorClass: STATUS_BAR_COLORS[status],
    }));
  }, [filteredWorkOrders]);

  const technicianPerformance = useMemo<TechnicianPerformance[]>(() => {
    const rows = technicians.map((tech) => {
      const assigned = filteredWorkOrders.filter(
        (wo) => wo.technician?.id === tech.id
      );
      const resolved = assigned.filter(
        (wo) => wo.status === "RESOLVED" || wo.status === "CLOSED"
      ).length;
      const total = assigned.length;
      return {
        id: tech.id,
        name: tech.user?.fullName || "Teknisyen",
        region: tech.region?.name || "—",
        total,
        open: total - resolved,
        resolved,
        completionRate: total > 0 ? Math.round((resolved / total) * 100) : 0,
        currentWorkload: tech.currentWorkload ?? 0,
        isAvailable: tech.isAvailable ?? true,
      };
    });
    return rows.sort((a, b) => b.total - a.total);
  }, [technicians, filteredWorkOrders]);

  const totalPages = Math.ceil(filteredWorkOrders.length / pageSize) || 0;
  const paginatedWorkOrders = filteredWorkOrders.slice(
    (page - 1) * pageSize,
    page * pageSize
  );

  const handleDownloadPdf = () => {
    if (!report) return;
    try {
      generateWorkOrderReportPdf({
        report,
        startDate,
        endDate,
        statusBreakdown: statusBreakdown.map((s) => ({
          label: s.label,
          value: s.value,
        })),
        workOrders: filteredWorkOrders.map((wo) => ({
          customer: wo.customer?.fullName || "-",
          device: wo.device?.serialNumber || "-",
          technician: wo.technician?.user?.fullName || "-",
          status: WORK_ORDER_STATUS_LABELS[wo.status] ?? wo.status,
          priority: wo.priority || "-",
          createdAt: formatDateTime(wo.createdAt),
        })),
        technicianPerformance: technicianPerformance.map((t) => ({
          name: t.name,
          total: t.total,
          open: t.open,
          resolved: t.resolved,
          completionRate: t.completionRate,
        })),
      });
      toast.success("PDF raporu indirildi");
    } catch {
      toast.error("PDF oluşturulamadı");
    }
  };

  const openWorkOrderDetail = async (wo: WorkOrder) => {
    setSelectedWorkOrder(wo);
    setSelectedHistory([]);
    setSelectedAttachments([]);
    setDetailModalOpen(true);
    setDetailModalLoading(true);
    try {
      const [history, attachments] = await Promise.all([
        workOrderService.getHistory(wo.id).catch(() => [] as WorkOrderStatusHistory[]),
        workOrderService
          .getAttachments(wo.id)
          .catch(() => [] as WorkOrderAttachment[]),
      ]);
      setSelectedHistory(history);
      setSelectedAttachments(attachments);
    } catch {
      toast.error("İş emri detayı yüklenemedi");
    } finally {
      setDetailModalLoading(false);
    }
  };

  const closeWorkOrderDetail = () => {
    setDetailModalOpen(false);
    setSelectedWorkOrder(null);
    setSelectedHistory([]);
    setSelectedAttachments([]);
  };

  return (
    <div className="space-y-5 sm:space-y-6">
      <PageHeader
        title="Raporlar"
        description="Operasyonel performans ve servis analizleri"
        icon={<BarChart3 className="h-5 w-5" />}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                void fetchReport();
                void fetchDetailData();
              }}
            >
              Yenile
            </Button>
            <Button
              size="sm"
              onClick={handleDownloadPdf}
              disabled={!report || reportLoading}
            >
              <FileDown className="mr-1.5 h-4 w-4" />
              PDF İndir
            </Button>
          </div>
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

      {reportError && <ErrorMessage message={reportError} />}

      <SectionCard title="İş Emri Özeti" description="Duruma göre iş emri sayıları">
        {reportLoading ? (
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

      <SectionCard
        title="Durum Dağılımı"
        description="Seçilen tarih aralığındaki iş emirlerinin durum kırılımı"
      >
        {detailLoading ? (
          <div className="space-y-4">
            <SkeletonCard />
          </div>
        ) : detailError ? (
          <ErrorMessage message={detailError} />
        ) : filteredWorkOrders.length === 0 ? (
          <EmptyState
            title="Grafik için veri yok"
            description="Seçilen tarih aralığında iş emri bulunamadı"
            icon={<PieChart className="h-8 w-8" />}
          />
        ) : (
          <StatusBarChart items={statusBreakdown} />
        )}
      </SectionCard>

      <SectionCard
        title="İş Emri Detay Raporu"
        description="Satıra tıklayarak iş emri detayını görüntüleyin ve PDF indirin"
        noPadding
      >
        {detailLoading ? (
          <SkeletonTable rows={6} />
        ) : detailError ? (
          <div className="p-5">
            <ErrorMessage message={detailError} />
          </div>
        ) : filteredWorkOrders.length === 0 ? (
          <div className="p-5">
            <EmptyState
              icon={<ListChecks className="h-8 w-8" />}
              title="İş emri bulunamadı"
              description="Seçilen tarih aralığında kayıt yok"
            />
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Müşteri</TableHead>
                    <TableHead>Cihaz</TableHead>
                    <TableHead>Teknisyen</TableHead>
                    <TableHead>Durum</TableHead>
                    <TableHead>Öncelik</TableHead>
                    <TableHead>Oluşturma</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedWorkOrders.map((wo) => (
                    <TableRow
                      key={wo.id}
                      className="cursor-pointer"
                      onClick={() => void openWorkOrderDetail(wo)}
                      title="Detayı görüntüle"
                    >
                      <TableCell className="font-medium text-navy">
                        {wo.customer?.fullName || "—"}
                      </TableCell>
                      <TableCell>{wo.device?.serialNumber || "—"}</TableCell>
                      <TableCell>{wo.technician?.user?.fullName || "—"}</TableCell>
                      <TableCell>
                        <Badge variant={statusBadgeVariant(wo.status)}>
                          {WORK_ORDER_STATUS_LABELS[wo.status] ?? wo.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{wo.priority || "—"}</TableCell>
                      <TableCell className="whitespace-nowrap text-xs text-slate-500">
                        {formatDateTime(wo.createdAt)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <Pagination
              currentPage={page}
              totalPages={totalPages}
              totalItems={filteredWorkOrders.length}
              pageSize={pageSize}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
            />
          </>
        )}
      </SectionCard>

      <SectionCard
        title="Teknisyen Performansı"
        description="Tarih aralığındaki iş yüküne göre teknisyen karşılaştırması"
        noPadding
      >
        {detailLoading ? (
          <SkeletonTable rows={5} />
        ) : detailError ? (
          <div className="p-5">
            <ErrorMessage message={detailError} />
          </div>
        ) : technicianPerformance.length === 0 ? (
          <div className="p-5">
            <EmptyState
              icon={<Wrench className="h-8 w-8" />}
              title="Teknisyen bulunamadı"
              description="Performans karşılaştırması için teknisyen kaydı gerekir"
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Teknisyen</TableHead>
                  <TableHead>Bölge</TableHead>
                  <TableHead>Toplam</TableHead>
                  <TableHead>Açık</TableHead>
                  <TableHead>Çözülen</TableHead>
                  <TableHead>Başarı Oranı</TableHead>
                  <TableHead>Güncel İş Yükü</TableHead>
                  <TableHead>Durum</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {technicianPerformance.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium text-slate-900">{t.name}</TableCell>
                    <TableCell>{t.region}</TableCell>
                    <TableCell>{t.total}</TableCell>
                    <TableCell>{t.open}</TableCell>
                    <TableCell>{t.resolved}</TableCell>
                    <TableCell>
                      <Badge variant={t.completionRate >= 70 ? "success" : t.completionRate >= 40 ? "warning" : "neutral"}>
                        %{t.completionRate}
                      </Badge>
                    </TableCell>
                    <TableCell>{t.currentWorkload}</TableCell>
                    <TableCell>
                      <Badge variant={t.isAvailable ? "success" : "neutral"}>
                        {t.isAvailable ? "Müsait" : "Meşgul"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </SectionCard>

      <WorkOrderPdfModal
        isOpen={detailModalOpen}
        onClose={closeWorkOrderDetail}
        workOrder={selectedWorkOrder}
        history={selectedHistory}
        attachments={selectedAttachments}
      />

      {detailModalOpen && detailModalLoading && (
        <div className="pointer-events-none fixed inset-0 z-[60] flex items-start justify-center pt-24">
          <span className="rounded-full bg-navy/80 px-3 py-1.5 text-xs text-white shadow-lg">
            Detay yükleniyor…
          </span>
        </div>
      )}
    </div>
  );
}
