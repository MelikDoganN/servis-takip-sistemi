"use client";

import { useEffect, useMemo, useState } from "react";
import { FileText } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { DetailList } from "@/components/ui/DetailList";
import { Badge } from "@/components/ui/Badge";
import {
  WORK_ORDER_STATUS_LABELS,
  WorkOrder,
  WorkOrderAttachment,
  WorkOrderStatus,
  WorkOrderStatusHistory,
  WorkOrderTimelineEvent,
} from "@/types/workOrder";
import { formatDateTime } from "@/lib/utils";
import {
  createWorkOrderDetailPdfBlobUrl,
  downloadWorkOrderDetailPdf,
  SingleWorkOrderPdfData,
} from "@/lib/pdfExport";
import { useToast } from "@/components/ui/Toast";

interface WorkOrderPdfModalProps {
  isOpen: boolean;
  onClose: () => void;
  workOrder: WorkOrder | null;
  history?: WorkOrderStatusHistory[];
  timeline?: WorkOrderTimelineEvent[];
  attachments?: WorkOrderAttachment[];
}

function statusBadgeVariant(
  status: WorkOrderStatus
): "default" | "success" | "warning" | "danger" | "info" | "neutral" {
  switch (status) {
    case "OPEN":
      return "warning";
    case "ASSIGNED":
    case "IN_PROGRESS":
    case "READY_FOR_DELIVERY":
      return "info";
    case "WAITING_PARTS":
      return "default";
    case "RESOLVED":
    case "DELIVERED":
      return "success";
    case "CLOSED":
      return "neutral";
    case "CANCELLED":
      return "danger";
    default:
      return "neutral";
  }
}

function statusLabel(status: string | null | undefined): string {
  if (!status) return "—";
  return WORK_ORDER_STATUS_LABELS[status as WorkOrderStatus] ?? status;
}

function toPdfData(
  wo: WorkOrder,
  history: WorkOrderStatusHistory[],
  timeline: WorkOrderTimelineEvent[],
  attachments: WorkOrderAttachment[]
): SingleWorkOrderPdfData {
  const timelineSource =
    timeline.length > 0
      ? [...timeline]
          .sort((a, b) => {
            const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            return ta - tb;
          })
          .map((h) => {
            const from = statusLabel(h.oldStatus);
            const to = statusLabel(h.newStatus);
            const when = formatDateTime(h.createdAt);
            const who = h.changedByName || "Sistem";
            return `${when}: ${from} → ${to} (${who})${
              h.description ? ` — ${h.description}` : ""
            }`;
          })
      : history.map((h) => {
          const from = statusLabel(h.oldStatus);
          const to = statusLabel(h.newStatus);
          const when = formatDateTime(h.createdAt);
          return `${when}: ${from} → ${to}${
            h.description ? ` (${h.description})` : ""
          }`;
        });

  return {
    workOrderNo: wo.serviceNumber || `WO-${wo.id}`,
    companyTitle: "Servis Takip Sistemi",
    customerName: wo.customer?.fullName || "-",
    customerPhone: wo.customer?.phone || undefined,
    customerEmail: wo.customer?.email || undefined,
    deviceSerial: wo.device?.serialNumber || "-",
    deviceBrandModel: [wo.device?.model?.brand?.name, wo.device?.model?.name]
      .filter(Boolean)
      .join(" / "),
    technicianName:
      wo.technician?.user?.fullName ||
      (wo.technician ? "Atanmis teknisyen" : "Atanmadi"),
    technicianPhone:
      wo.technician?.whatsappNumber || wo.technician?.user?.phone || undefined,
    description: wo.description || "-",
    status: WORK_ORDER_STATUS_LABELS[wo.status] ?? wo.status,
    priority: wo.priority || "-",
    serviceType: wo.serviceType || undefined,
    createdAt: formatDateTime(wo.createdAt),
    assignedAt: formatDateTime(wo.assignedAt),
    completedAt: formatDateTime(wo.resolvedAt || wo.completedAt),
    deliveredAt: formatDateTime(wo.deliveredAt),
    closedAt: formatDateTime(wo.closedAt),
    resolutionNote: wo.resolutionNote || undefined,
    deliveryNote: wo.deliveryNote || undefined,
    cancellationReason: wo.cancellationReason || undefined,
    historyLines: timelineSource,
    attachmentNames: attachments.map((a) => a.fileName),
  };
}

export function WorkOrderPdfModal({
  isOpen,
  onClose,
  workOrder,
  history = [],
  timeline = [],
  attachments = [],
}: WorkOrderPdfModalProps) {
  const toast = useToast();
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const pdfData = useMemo(() => {
    if (!workOrder) return null;
    return toPdfData(workOrder, history, timeline, attachments);
  }, [workOrder, history, timeline, attachments]);

  useEffect(() => {
    if (!isOpen && previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
  }, [isOpen, previewUrl]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const handlePreview = () => {
    if (!pdfData) return;
    try {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      const url = createWorkOrderDetailPdfBlobUrl(pdfData);
      setPreviewUrl(url);
    } catch {
      toast.error("PDF oluşturulamadı.");
    }
  };

  const handleDownload = () => {
    if (!pdfData || !workOrder) return;
    try {
      downloadWorkOrderDetailPdf(
        pdfData,
        `Servis-${workOrder.serviceNumber || workOrder.id}.pdf`.replace(
          /\s+/g,
          "-"
        )
      );
      toast.success("PDF indirildi");
    } catch {
      toast.error("PDF oluşturulamadı.");
    }
  };

  if (!workOrder) return null;

  const timelineRows =
    timeline.length > 0
      ? [...timeline].sort((a, b) => {
          const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return ta - tb;
        })
      : history;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="İş Emri Detay Raporu"
      size="lg"
    >
      <div className="space-y-5">
        <DetailList
          items={[
            {
              label: "Servis No",
              value: workOrder.serviceNumber || "—",
            },
            { label: "Müşteri", value: workOrder.customer?.fullName || "—" },
            {
              label: "Müşteri Telefon",
              value: workOrder.customer?.phone || "—",
            },
            {
              label: "Cihaz",
              value: workOrder.device?.serialNumber || "—",
            },
            {
              label: "Marka / Model",
              value:
                [workOrder.device?.model?.brand?.name, workOrder.device?.model?.name]
                  .filter(Boolean)
                  .join(" / ") || "—",
            },
            {
              label: "Teknisyen",
              value: workOrder.technician?.user?.fullName || "Atanmadı",
            },
            {
              label: "Durum",
              value: (
                <Badge variant={statusBadgeVariant(workOrder.status)}>
                  {WORK_ORDER_STATUS_LABELS[workOrder.status] ?? workOrder.status}
                </Badge>
              ),
            },
            { label: "Öncelik", value: workOrder.priority || "—" },
            {
              label: "Açıklama / Notlar",
              value: workOrder.description || "—",
            },
            {
              label: "Çözüm notu",
              value: workOrder.resolutionNote || "—",
            },
            {
              label: "Teslim notu",
              value: workOrder.deliveryNote || "—",
            },
            {
              label: "İptal nedeni",
              value: workOrder.cancellationReason || "—",
            },
            {
              label: "Oluşturma",
              value: formatDateTime(workOrder.createdAt),
            },
            {
              label: "Atama",
              value: formatDateTime(workOrder.assignedAt),
            },
            {
              label: "Çözüm tarihi",
              value: formatDateTime(workOrder.resolvedAt || workOrder.completedAt),
            },
            {
              label: "Teslim tarihi",
              value: formatDateTime(workOrder.deliveredAt),
            },
            {
              label: "Kapanış",
              value: formatDateTime(workOrder.closedAt),
            },
          ]}
        />

        <div>
          <h4 className="mb-2 text-sm font-semibold text-slate-800">
            Zaman Çizelgesi
          </h4>
          {timelineRows.length === 0 ? (
            <p className="text-xs text-slate-400">Durum geçmişi yok</p>
          ) : (
            <ul className="max-h-32 space-y-1 overflow-y-auto text-xs text-slate-600">
              {timelineRows.map((h) => (
                <li key={h.id} className="rounded-lg bg-slate-50 px-2 py-1.5">
                  {formatDateTime(h.createdAt)}: {statusLabel(h.oldStatus)} →{" "}
                  {statusLabel(h.newStatus)}
                  {"description" in h && h.description
                    ? ` — ${h.description}`
                    : ""}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <h4 className="mb-2 text-sm font-semibold text-slate-800">
            Kullanılan Parçalar / Ekler
          </h4>
          {attachments.length === 0 ? (
            <p className="text-xs text-slate-400">Kayıt yok</p>
          ) : (
            <ul className="space-y-1 text-xs text-slate-600">
              {attachments.map((a) => (
                <li key={a.id}>{a.fileName}</li>
              ))}
            </ul>
          )}
        </div>

        {previewUrl && (
          <div className="overflow-hidden rounded-xl border border-slate-200">
            <iframe
              title="PDF Önizleme"
              src={previewUrl}
              className="h-72 w-full bg-slate-50"
            />
          </div>
        )}

        <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-4">
          <Button type="button" variant="outline" onClick={onClose}>
            Kapat
          </Button>
          <Button type="button" variant="secondary" onClick={handlePreview}>
            <FileText className="mr-1.5 h-4 w-4" />
            PDF Önizle
          </Button>
          <Button type="button" onClick={handleDownload}>
            PDF İndir
          </Button>
        </div>
      </div>
    </Modal>
  );
}
