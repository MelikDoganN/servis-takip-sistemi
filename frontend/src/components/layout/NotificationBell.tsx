"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Bell,
  CheckCheck,
  ClipboardList,
  ShieldAlert,
  UserCheck,
  RefreshCw,
  Settings2,
} from "lucide-react";
import { cn, formatDateTime } from "@/lib/utils";
import { EmptyState } from "@/components/ui/EmptyState";
import { SkeletonList } from "@/components/ui/Skeleton";
import { Badge } from "@/components/ui/Badge";
import { notificationService } from "@/services/notificationService";
import { NotificationDto } from "@/types/notification";
import {
  notificationChannelLabel,
  notificationDisplayMessage,
  notificationDisplayTitle,
  notificationHref,
  notificationTypeLabel,
} from "@/lib/notificationLabels";
import { useUnreadNotificationCount } from "@/hooks/useUnreadNotificationCount";
import { ApiError } from "@/types/api";

function typeIcon(type: string) {
  switch (type) {
    case "TECHNICIAN_ASSIGNED":
      return <UserCheck className="h-4 w-4" />;
    case "WARRANTY_WARNING":
      return <ShieldAlert className="h-4 w-4" />;
    case "SYSTEM":
      return <Settings2 className="h-4 w-4" />;
    case "STATUS_CHANGED":
      return <RefreshCw className="h-4 w-4" />;
    default:
      return <ClipboardList className="h-4 w-4" />;
  }
}

function typeIconBg(type: string): string {
  switch (type) {
    case "TECHNICIAN_ASSIGNED":
      return "bg-emerald-50 text-emerald-600";
    case "WARRANTY_WARNING":
      return "bg-amber-50 text-amber-600";
    case "SYSTEM":
      return "bg-slate-100 text-slate-600";
    case "STATUS_CHANGED":
      return "bg-violet-50 text-violet-600";
    default:
      return "bg-sky-50 text-sky-600";
  }
}

export function NotificationBell() {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const listAbortRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);

  const { count: unreadCount, refresh, decrement, resetToZero } =
    useUnreadNotificationCount();

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notifications, setNotifications] = useState<NotificationDto[]>([]);
  const [markingAll, setMarkingAll] = useState(false);

  const fetchList = useCallback(async () => {
    listAbortRef.current?.abort();
    const controller = new AbortController();
    listAbortRef.current = controller;

    if (mountedRef.current) {
      setLoading(true);
      setError("");
    }

    try {
      const page = await notificationService.getNotifications(
        0,
        10,
        undefined,
        controller.signal
      );
      if (mountedRef.current && !controller.signal.aborted) {
        setNotifications(page.content ?? []);
      }
    } catch (err) {
      if (controller.signal.aborted) return;
      if (mountedRef.current) {
        const apiErr = err as ApiError;
        setError(apiErr.message || "Bildirimler yüklenemedi");
        setNotifications([]);
      }
    } finally {
      if (mountedRef.current && !controller.signal.aborted) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      listAbortRef.current?.abort();
    };
  }, []);

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

  useEffect(() => {
    if (open) {
      void fetchList();
      void refresh();
    }
  }, [open, fetchList, refresh]);

  const handleSelect = async (n: NotificationDto) => {
    if (!n.read) {
      try {
        await notificationService.markAsRead(n.id);
        if (mountedRef.current) {
          setNotifications((prev) =>
            prev.map((item) =>
              item.id === n.id
                ? { ...item, read: true, readAt: new Date().toISOString() }
                : item
            )
          );
          decrement();
        }
      } catch {
        // Yönlendirme yine yapılsın
      }
    }
    setOpen(false);
    const href = notificationHref(n);
    if (href) router.push(href);
  };

  const handleMarkAll = async () => {
    if (markingAll) return;
    setMarkingAll(true);
    try {
      await notificationService.markAllAsRead();
      if (mountedRef.current) {
        setNotifications((prev) =>
          prev.map((item) => ({
            ...item,
            read: true,
            readAt: item.readAt ?? new Date().toISOString(),
          }))
        );
        resetToZero();
      }
    } catch {
      // sessiz
    } finally {
      if (mountedRef.current) setMarkingAll(false);
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 hover:text-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30"
        aria-label="Bildirimler"
        aria-expanded={open}
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
                Son kayıtlar · uygulama bildirimleri
              </p>
            </div>
            <div className="flex items-center gap-2">
              {notifications.some((n) => !n.read) && (
                <button
                  type="button"
                  onClick={() => void handleMarkAll()}
                  disabled={markingAll}
                  className="flex items-center gap-1 text-xs font-medium text-accent-strong hover:underline disabled:opacity-50"
                >
                  <CheckCheck className="h-3.5 w-3.5" />
                  Tümünü okundu yap
                </button>
              )}
            </div>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="p-3">
                <SkeletonList items={4} />
              </div>
            ) : error ? (
              <EmptyState
                className="py-8"
                title="Bildirimler yüklenemedi"
                description={error}
              />
            ) : notifications.length === 0 ? (
              <EmptyState
                className="py-8"
                title="Yeni bildirim yok"
                description="Henüz bildirim kaydı bulunmuyor."
              />
            ) : (
              <ul className="divide-y divide-slate-100">
                {notifications.map((n) => (
                  <li key={n.id}>
                    <button
                      type="button"
                      onClick={() => void handleSelect(n)}
                      className={cn(
                        "flex w-full items-start gap-3 px-4 py-3 text-left transition hover:bg-accent-soft",
                        !n.read && "bg-primary-50/60"
                      )}
                    >
                      <span
                        className={cn(
                          "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                          typeIconBg(n.type)
                        )}
                      >
                        {typeIcon(n.type)}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-1.5">
                          <span className="truncate text-sm font-medium text-slate-800">
                            {notificationDisplayTitle(n)}
                          </span>
                          {!n.read && (
                            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                          )}
                        </span>
                        <span className="mt-0.5 block text-[10px] font-medium text-slate-500">
                          {notificationTypeLabel(n.type)}
                        </span>
                        <span className="mt-0.5 block truncate text-xs text-slate-500">
                          {notificationDisplayMessage(n)}
                        </span>
                        <span className="mt-1 flex flex-wrap items-center gap-1.5">
                          <span className="text-[10px] text-slate-400">
                            {formatDateTime(n.createdAt)}
                          </span>
                          <Badge variant="neutral" className="text-[9px]">
                            {notificationChannelLabel(n.channel)}
                          </Badge>
                          <span
                            className={cn(
                              "text-[10px] font-medium",
                              n.read ? "text-slate-400" : "text-accent-strong"
                            )}
                          >
                            {n.read ? "Okundu" : "Okunmadı"}
                          </span>
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="border-t border-slate-100 px-4 py-2.5">
            <Link
              href="/bildirimler"
              onClick={() => setOpen(false)}
              className="block text-center text-xs font-medium text-accent-strong hover:underline"
            >
              Tüm bildirimleri gör
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
