"use client";

import { RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import {
  WHATSAPP_OUTBOX_STATUS_LABELS,
  WhatsAppOutboxItem,
  WorkOrder,
} from "@/types/workOrder";
import { formatDateTime } from "@/lib/utils";

interface WorkOrderWhatsAppPanelProps {
  workOrder: WorkOrder;
  outbox: WhatsAppOutboxItem[];
  loading?: boolean;
  error?: string;
  retryingId?: number | "all" | null;
  onRetryAll: () => void;
  onRetryOne: (outboxId: number) => void;
}

function outboxStatusLabel(status: string): string {
  return WHATSAPP_OUTBOX_STATUS_LABELS[status] ?? status;
}

function outboxBadgeVariant(
  status: string
): "default" | "success" | "warning" | "danger" | "info" | "neutral" {
  switch (status) {
    case "SENT":
      return "success";
    case "FAILED":
      return "danger";
    case "PENDING":
    case "PROCESSING":
      return "warning";
    default:
      return "neutral";
  }
}

function lastStatusLabel(status: string | null | undefined): string {
  if (!status) return "—";
  return WHATSAPP_OUTBOX_STATUS_LABELS[status] ?? status;
}

export function WorkOrderWhatsAppPanel({
  workOrder,
  outbox,
  loading,
  error,
  retryingId,
  onRetryAll,
  onRetryOne,
}: WorkOrderWhatsAppPanelProps) {
  const failedCount = outbox.filter((o) => o.status === "FAILED").length;
  const lastFailed = workOrder.lastNotificationStatus === "FAILED";

  if (loading) {
    return (
      <div className="space-y-2">
        <div className="skeleton h-4 w-40" />
        <div className="skeleton h-20 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {error && <ErrorMessage message={error} />}

      <div className="grid grid-cols-1 gap-2 rounded-xl border border-slate-100 bg-slate-50/80 p-3 text-sm sm:grid-cols-2">
        <div>
          <p className="text-xs text-slate-500">Son bildirim durumu</p>
          <p className="font-medium text-slate-800">
            {lastStatusLabel(workOrder.lastNotificationStatus)}
          </p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Son gönderim</p>
          <p className="font-medium text-slate-800">
            {formatDateTime(workOrder.customerNotifiedAt)}
          </p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Bildirim sayısı</p>
          <p className="font-medium text-slate-800">
            {workOrder.customerNotificationCount ?? 0}
          </p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Meta mesaj kimliği</p>
          <p className="truncate font-mono text-xs text-slate-600">
            {workOrder.lastWhatsappMessageId || "—"}
          </p>
        </div>
      </div>

      {(lastFailed || failedCount > 0) && (
        <div className="flex justify-end">
          <Button
            type="button"
            size="sm"
            variant="secondary"
            loading={retryingId === "all"}
            onClick={onRetryAll}
          >
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
            Tekrar Gönder
          </Button>
        </div>
      )}

      {!outbox.length ? (
        <EmptyState
          title="WhatsApp kuyruğu boş"
          description="Bu kayıt için outbox mesajı yok"
        />
      ) : (
        <ul className="space-y-2">
          {outbox.map((row) => (
            <li
              key={row.id}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 shadow-soft"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={outboxBadgeVariant(row.status)}>
                      {outboxStatusLabel(row.status)}
                    </Badge>
                    <span className="text-xs text-slate-500">
                      {row.eventType}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    {formatDateTime(row.createdAt)}
                    {row.sentAt ? ` · Gönderildi: ${formatDateTime(row.sentAt)}` : ""}
                  </p>
                  {row.lastError && (
                    <p className="mt-1 text-xs text-rose-600">
                      Gönderilemedi. Daha sonra tekrar deneyin.
                    </p>
                  )}
                </div>
                {(row.status === "FAILED" || row.status === "PENDING") && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    loading={retryingId === row.id}
                    onClick={() => onRetryOne(row.id)}
                  >
                    Yeniden kuyruğa al
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
