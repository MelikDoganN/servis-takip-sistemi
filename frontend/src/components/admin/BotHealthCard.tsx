"use client";

import { useEffect, useRef, useState } from "react";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  CloudOff,
  Loader2,
} from "lucide-react";
import { botOpsService } from "@/services/botOpsService";
import { BotHealthDto } from "@/types/notification";
import { ApiError } from "@/types/api";
import { formatDateTime } from "@/lib/utils";
import { SectionCard } from "@/components/ui/SectionCard";
import { Badge } from "@/components/ui/Badge";
import { isAdmin } from "@/lib/auth";

/**
 * ADMIN-only bot sağlık kartı. Hata durumunda ana UI'yı bozmaz.
 */
export function BotHealthCard() {
  const mountedRef = useRef(true);
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [health, setHealth] = useState<BotHealthDto | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    mountedRef.current = true;
    if (!isAdmin()) {
      setVisible(false);
      setLoading(false);
      return;
    }
    setVisible(true);
    const controller = new AbortController();
    void (async () => {
      try {
        const data = await botOpsService.getHealth(controller.signal);
        if (mountedRef.current && !controller.signal.aborted) {
          setHealth(data);
        }
      } catch (err) {
        if (controller.signal.aborted) return;
        if (mountedRef.current) {
          const apiErr = err as ApiError;
          setError(apiErr.message || "Bot sağlık bilgisi alınamadı");
        }
      } finally {
        if (mountedRef.current && !controller.signal.aborted) {
          setLoading(false);
        }
      }
    })();
    return () => {
      mountedRef.current = false;
      controller.abort();
    };
  }, []);

  if (!visible) return null;

  return (
    <SectionCard
      title="WhatsApp Bot Sağlığı"
      description="Yapılandırma ve outbox durumu (URL/secret gösterilmez)"
      noPadding
    >
      {loading ? (
        <div className="flex items-center gap-2 px-5 py-8 text-sm text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          Kontrol ediliyor…
        </div>
      ) : error ? (
        <div className="flex items-start gap-2 px-5 py-6 text-sm text-slate-600">
          <CloudOff className="mt-0.5 h-4 w-4 text-slate-400" />
          <div>
            <p className="font-medium text-slate-700">Sağlık bilgisi alınamadı</p>
            <p className="mt-1 text-xs text-slate-500">{error}</p>
          </div>
        </div>
      ) : health ? (
        <div className="grid gap-3 px-5 py-4 sm:grid-cols-2 lg:grid-cols-3">
          <Stat
            label="Yapılandırma"
            value={health.botUrlConfigured ? "Tanımlı" : "Eksik"}
            badge={
              <Badge variant={health.botUrlConfigured ? "success" : "warning"}>
                {health.botUrlConfigured ? "OK" : "Eksik"}
              </Badge>
            }
          />
          <Stat
            label="Erişilebilirlik"
            value={health.botReachable ? "Erişilebilir" : "Erişilemiyor"}
            badge={
              <Badge variant={health.botReachable ? "success" : "danger"}>
                {health.botStatus || (health.botReachable ? "UP" : "DOWN")}
              </Badge>
            }
          />
          <Stat
            label="Pending outbox"
            value={String(health.pendingOutboxCount)}
            icon={<Activity className="h-4 w-4 text-sky-500" />}
          />
          <Stat
            label="Failed outbox"
            value={String(health.failedOutboxCount)}
            icon={<AlertTriangle className="h-4 w-4 text-amber-500" />}
          />
          <Stat
            label="Son başarılı"
            value={
              health.lastSuccessfulSendAt
                ? formatDateTime(health.lastSuccessfulSendAt)
                : "—"
            }
            icon={<CheckCircle2 className="h-4 w-4 text-emerald-500" />}
          />
          <Stat
            label="Son başarısız"
            value={
              health.lastFailedSendAt
                ? formatDateTime(health.lastFailedSendAt)
                : "—"
            }
            icon={<CloudOff className="h-4 w-4 text-slate-400" />}
          />
        </div>
      ) : null}
    </SectionCard>
  );
}

function Stat({
  label,
  value,
  badge,
  icon,
}: {
  label: string;
  value: string;
  badge?: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50/60 px-3.5 py-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
          {label}
        </p>
        {badge ?? icon}
      </div>
      <p className="mt-1.5 text-sm font-semibold text-navy">{value}</p>
    </div>
  );
}
