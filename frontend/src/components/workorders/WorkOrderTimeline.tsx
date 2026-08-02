"use client";

import { Clock3 } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import {
  WORK_ORDER_STATUS_LABELS,
  WorkOrderStatus,
  WorkOrderTimelineEvent,
} from "@/types/workOrder";
import { formatDateTime } from "@/lib/utils";

interface WorkOrderTimelineProps {
  events: WorkOrderTimelineEvent[];
  loading?: boolean;
  error?: string;
}

function statusLabel(status: string | null | undefined): string {
  if (!status) return "—";
  return WORK_ORDER_STATUS_LABELS[status as WorkOrderStatus] ?? status;
}

function channelLabel(channel: string | null | undefined): string {
  if (!channel) return "—";
  if (channel === "WEB") return "Web";
  if (channel === "WHATSAPP") return "WhatsApp";
  return channel;
}

export function WorkOrderTimeline({
  events,
  loading,
  error,
}: WorkOrderTimelineProps) {
  if (loading) {
    return (
      <div className="space-y-3">
        <div className="skeleton h-4 w-32" />
        <div className="skeleton h-16 w-full rounded-xl" />
        <div className="skeleton h-16 w-full rounded-xl" />
      </div>
    );
  }

  if (error) {
    return <ErrorMessage message={error} />;
  }

  if (!events.length) {
    return (
      <EmptyState
        title="Zaman çizelgesi boş"
        description="Henüz durum değişikliği kaydı yok"
      />
    );
  }

  // API desc döner; görsel olarak eskiden yeniye (kronolojik) göster
  const ordered = [...events].sort((a, b) => {
    const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return ta - tb;
  });

  return (
    <ol className="relative space-y-0 border-l border-slate-200 pl-5">
      {ordered.map((ev) => (
        <li key={ev.id} className="relative pb-5 last:pb-0">
          <span className="absolute -left-[1.4rem] top-1.5 flex h-5 w-5 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-400">
            <Clock3 className="h-3 w-3" />
          </span>
          <div className="rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2.5">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="neutral">{statusLabel(ev.oldStatus)}</Badge>
              <span className="text-xs text-slate-400">→</span>
              <Badge variant="info">{statusLabel(ev.newStatus)}</Badge>
              <span className="text-xs text-slate-400">
                {formatDateTime(ev.createdAt)}
              </span>
            </div>
            <p className="mt-1.5 text-sm text-slate-700">
              {ev.description ||
                `${statusLabel(ev.oldStatus)} → ${statusLabel(ev.newStatus)}`}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {ev.changedByName || "Sistem"} · {channelLabel(ev.channel)}
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}
