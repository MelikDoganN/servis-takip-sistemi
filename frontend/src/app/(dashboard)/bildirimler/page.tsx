"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, CheckCheck } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { SectionCard } from "@/components/ui/SectionCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { Pagination } from "@/components/ui/Pagination";
import { SkeletonTable } from "@/components/ui/Skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/Table";
import { notificationService } from "@/services/notificationService";
import { NotificationDto } from "@/types/notification";
import { ApiError } from "@/types/api";
import { cn, formatDateTime } from "@/lib/utils";
import {
  notificationChannelLabel,
  notificationHref,
  notificationStatusLabel,
  notificationDisplayMessage,
  notificationDisplayTitle,
  notificationTypeLabel,
} from "@/lib/notificationLabels";
import { isAdmin } from "@/lib/auth";

type FilterMode = "all" | "unread";

export default function BildirimlerPage() {
  const router = useRouter();
  const mountedRef = useRef(true);
  const abortRef = useRef<AbortController | null>(null);

  const [items, setItems] = useState<NotificationDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<FilterMode>("all");
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [markingAll, setMarkingAll] = useState(false);
  const [showAdminStatus, setShowAdminStatus] = useState(false);

  useEffect(() => {
    mountedRef.current = true;
    setShowAdminStatus(isAdmin());
    return () => {
      mountedRef.current = false;
      abortRef.current?.abort();
    };
  }, []);

  const load = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError("");
    try {
      const isRead = filter === "unread" ? false : undefined;
      const res = await notificationService.getNotifications(
        page,
        pageSize,
        isRead,
        controller.signal
      );
      if (!mountedRef.current || controller.signal.aborted) return;
      setItems(res.content ?? []);
      setTotalElements(res.totalElements ?? 0);
      setTotalPages(res.totalPages ?? 0);
    } catch (err) {
      if (controller.signal.aborted) return;
      if (mountedRef.current) {
        const apiErr = err as ApiError;
        setError(apiErr.message || "Bildirimler yüklenemedi");
        setItems([]);
      }
    } finally {
      if (mountedRef.current && !controller.signal.aborted) {
        setLoading(false);
      }
    }
  }, [filter, page, pageSize]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleMarkOne = async (n: NotificationDto) => {
    if (!n.read) {
      try {
        await notificationService.markAsRead(n.id);
        if (mountedRef.current) {
          setItems((prev) =>
            prev.map((item) =>
              item.id === n.id
                ? { ...item, read: true, readAt: new Date().toISOString() }
                : item
            )
          );
        }
      } catch {
        // yine de yönlendir
      }
    }
    const href = notificationHref(n);
    if (href) router.push(href);
  };

  const handleMarkAll = async () => {
    setMarkingAll(true);
    try {
      await notificationService.markAllAsRead();
      if (mountedRef.current) {
        setItems((prev) =>
          prev.map((item) => ({
            ...item,
            read: true,
            readAt: item.readAt ?? new Date().toISOString(),
          }))
        );
        if (filter === "unread") {
          void load();
        }
      }
    } catch (err) {
      const apiErr = err as ApiError;
      setError(apiErr.message || "Toplu okundu işaretlenemedi");
    } finally {
      if (mountedRef.current) setMarkingAll(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Bildirimler"
        description="Sistem ve iş emri bildirimleriniz"
        icon={<Bell className="h-5 w-5" />}
        action={
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={markingAll || items.every((i) => i.read)}
            onClick={() => void handleMarkAll()}
            className="gap-1.5"
          >
            <CheckCheck className="h-4 w-4" />
            Tümünü okundu yap
          </Button>
        }
      />

      <SectionCard noPadding>
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-4 py-3 sm:px-5">
          <Button
            type="button"
            size="sm"
            variant={filter === "all" ? "primary" : "outline"}
            onClick={() => {
              setPage(0);
              setFilter("all");
            }}
          >
            Tümü
          </Button>
          <Button
            type="button"
            size="sm"
            variant={filter === "unread" ? "primary" : "outline"}
            onClick={() => {
              setPage(0);
              setFilter("unread");
            }}
          >
            Yalnız okunmamış
          </Button>
        </div>

        {error && (
          <div className="px-4 pt-4 sm:px-5">
            <ErrorMessage message={error} />
          </div>
        )}

        {loading ? (
          <SkeletonTable rows={6} />
        ) : items.length === 0 ? (
          <EmptyState
            className="py-12"
            title="Bildirim bulunamadı"
            description={
              filter === "unread"
                ? "Okunmamış bildiriminiz yok."
                : "Henüz bildirim kaydı oluşmamış."
            }
          />
        ) : (
          <>
            {/* Mobil kartlar */}
            <div className="space-y-3 p-4 md:hidden">
              {items.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => void handleMarkOne(n)}
                  className={cn(
                    "w-full rounded-xl border border-slate-200 p-4 text-left transition hover:border-accent/40",
                    !n.read && "border-accent/30 bg-primary-50/50"
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-semibold text-navy">
                      {notificationDisplayTitle(n)}
                    </p>
                    {!n.read && (
                      <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-accent" />
                    )}
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    {notificationTypeLabel(n.type)}
                  </p>
                  <p className="mt-2 text-sm text-slate-600">
                    {notificationDisplayMessage(n)}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    <Badge variant="neutral">
                      {notificationChannelLabel(n.channel)}
                    </Badge>
                    <Badge variant={n.read ? "neutral" : "info"}>
                      {n.read ? "Okundu" : "Okunmadı"}
                    </Badge>
                    {showAdminStatus && (
                      <Badge
                        variant={
                          n.status === "FAILED"
                            ? "danger"
                            : n.status === "PENDING"
                              ? "warning"
                              : "neutral"
                        }
                      >
                        {notificationStatusLabel(n.status)}
                      </Badge>
                    )}
                  </div>
                  <p className="mt-2 text-[11px] text-slate-400">
                    {formatDateTime(n.createdAt)}
                  </p>
                </button>
              ))}
            </div>

            {/* Masaüstü tablo */}
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Başlık</TableHead>
                    <TableHead>Tür</TableHead>
                    <TableHead>Mesaj</TableHead>
                    <TableHead>Kanal</TableHead>
                    <TableHead>Durum</TableHead>
                    <TableHead>Tarih</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((n) => (
                    <TableRow
                      key={n.id}
                      className={cn(
                        "cursor-pointer",
                        !n.read && "bg-primary-50/40"
                      )}
                      onClick={() => void handleMarkOne(n)}
                    >
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {!n.read && (
                            <span className="h-2 w-2 shrink-0 rounded-full bg-accent" />
                          )}
                          <span className="font-medium text-navy">
                            {notificationDisplayTitle(n)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-slate-600">
                        {notificationTypeLabel(n.type)}
                      </TableCell>
                      <TableCell className="max-w-xs truncate text-slate-600">
                        {notificationDisplayMessage(n)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="neutral">
                          {notificationChannelLabel(n.channel)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <Badge variant={n.read ? "neutral" : "info"}>
                            {n.read ? "Okundu" : "Okunmadı"}
                          </Badge>
                          {showAdminStatus && n.channel === "WHATSAPP" && (
                            <Badge
                              variant={
                                n.status === "FAILED" ? "danger" : "neutral"
                              }
                            >
                              {notificationStatusLabel(n.status)}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-slate-500">
                        {formatDateTime(n.createdAt)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <Pagination
              currentPage={page + 1}
              totalPages={totalPages}
              totalItems={totalElements}
              pageSize={pageSize}
              onPageChange={(p) => setPage(p - 1)}
              onPageSizeChange={(size) => {
                setPage(0);
                setPageSize(size);
              }}
            />
          </>
        )}
      </SectionCard>
    </div>
  );
}
