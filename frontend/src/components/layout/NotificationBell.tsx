"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Bell,
  CheckCheck,
  ClipboardList,
} from "lucide-react";
import { cn, formatDateTime } from "@/lib/utils";
import { workOrderService } from "@/services/workOrderService";
import { EmptyState } from "@/components/ui/EmptyState";

type NotificationType = "new-order" | "open-order";

interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  createdAt: string;
  href?: string;
}

const READ_STORAGE_KEY = "servis-takip:read-notifications";
const OPEN_ORDER_STALE_HOURS = 48;

function loadReadIds(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(READ_STORAGE_KEY);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

function saveReadIds(ids: Set<string>) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(READ_STORAGE_KEY, JSON.stringify([...ids]));
}

const TYPE_META: Record<
  NotificationType,
  { icon: React.ReactNode; iconBg: string }
> = {
  "new-order": {
    icon: <ClipboardList className="h-4 w-4" />,
    iconBg: "bg-sky-50 text-sky-600",
  },
  "open-order": {
    icon: <AlertTriangle className="h-4 w-4" />,
    iconBg: "bg-amber-50 text-amber-600",
  },
};

/**
 * Backend bildirim listesi endpoint'i yok.
 * Yalnızca gerçek iş emri kayıtlarından türetilmiş uyarılar gösterilir
 * (tahmini garanti / sahte bildirim yok).
 */
export function NotificationBell() {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [readIds, setReadIds] = useState<Set<string>>(() => loadReadIds());

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    setError(false);
    const items: AppNotification[] = [];

    try {
      const workOrders = await workOrderService.getAll(200);

      [...workOrders]
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )
        .slice(0, 5)
        .forEach((wo) =>
          items.push({
            id: `new-order-${wo.id}`,
            type: "new-order",
            title: "Yeni iş emri",
            message: wo.customer?.fullName || "Yeni iş emri kaydı",
            createdAt: wo.createdAt,
            href: "/is-emirleri",
          })
        );

      const staleThreshold = Date.now() - OPEN_ORDER_STALE_HOURS * 3600 * 1000;
      workOrders
        .filter(
          (wo) =>
            (wo.status === "OPEN" || wo.status === "ASSIGNED") &&
            new Date(wo.createdAt).getTime() < staleThreshold
        )
        .slice(0, 5)
        .forEach((wo) =>
          items.push({
            id: `open-order-${wo.id}`,
            type: "open-order",
            title: "Açık kalan iş emri",
            message: `${wo.customer?.fullName || "İş emri"} uzun süredir açık`,
            createdAt: wo.createdAt,
            href: "/is-emirleri",
          })
        );

      items.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      setNotifications(items);
    } catch {
      setError(true);
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchNotifications();
  }, [fetchNotifications]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const unreadCount = notifications.filter((n) => !readIds.has(n.id)).length;

  const markAsRead = (id: string) => {
    setReadIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      saveReadIds(next);
      return next;
    });
  };

  const markAllRead = () => {
    setReadIds((prev) => {
      const next = new Set(prev);
      notifications.forEach((n) => next.add(n.id));
      saveReadIds(next);
      return next;
    });
  };

  const handleSelect = (n: AppNotification) => {
    markAsRead(n.id);
    setOpen(false);
    if (n.href) router.push(n.href);
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 hover:text-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30"
        aria-label="Bildirimler"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute right-1.5 top-1.5 flex h-3.5 min-w-[0.875rem] items-center justify-center rounded-full bg-accent px-0.5 text-[9px] font-semibold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-30 mt-2 w-[24rem] max-w-[90vw] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-elevated animate-fade-in">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-slate-800">Bildirimler</p>
              <p className="text-[10px] text-slate-400">
                İş emri kayıtlarından türetilir
              </p>
            </div>
            {notifications.length > 0 && (
              <button
                type="button"
                onClick={markAllRead}
                className="flex items-center gap-1 text-xs font-medium text-accent-strong hover:underline"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                Tümünü okundu yap
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="px-4 py-6 text-center text-sm text-slate-500">
                Yükleniyor…
              </div>
            ) : error ? (
              <EmptyState
                className="py-8"
                title="Bildirimler yüklenemedi"
                description="İş emri verilerine erişilemedi. Daha sonra tekrar deneyin."
              />
            ) : notifications.length === 0 ? (
              <EmptyState
                className="py-8"
                title="Yeni bildirim yok"
                description="Açık veya yeni iş emri uyarısı bulunmuyor."
              />
            ) : (
              <ul className="divide-y divide-slate-100">
                {notifications.map((n) => {
                  const isRead = readIds.has(n.id);
                  const meta = TYPE_META[n.type];
                  return (
                    <li key={n.id}>
                      <button
                        type="button"
                        onClick={() => handleSelect(n)}
                        className={cn(
                          "flex w-full items-start gap-3 px-4 py-3 text-left transition hover:bg-accent-soft",
                          !isRead && "bg-primary-50/60"
                        )}
                      >
                        <span
                          className={cn(
                            "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                            meta.iconBg
                          )}
                        >
                          {meta.icon}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-1.5">
                            <span className="truncate text-sm font-medium text-slate-800">
                              {n.title}
                            </span>
                            {!isRead && (
                              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                            )}
                          </span>
                          <span className="block truncate text-xs text-slate-500">
                            {n.message}
                          </span>
                          <span className="mt-0.5 block text-[10px] text-slate-400">
                            {formatDateTime(n.createdAt)}
                          </span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
