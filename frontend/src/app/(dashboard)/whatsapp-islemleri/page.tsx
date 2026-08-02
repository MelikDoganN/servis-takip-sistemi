"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { MessageSquare } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { SectionCard } from "@/components/ui/SectionCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { Badge } from "@/components/ui/Badge";
import { Select } from "@/components/ui/Select";
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
import { botOpsService } from "@/services/botOpsService";
import { BotInteractionLogDto } from "@/types/notification";
import { ApiError } from "@/types/api";
import { formatDateTime } from "@/lib/utils";
import { isAdmin } from "@/lib/auth";

function statusVariant(
  status: string | null
): "default" | "success" | "warning" | "danger" | "info" | "neutral" {
  switch ((status || "").toUpperCase()) {
    case "SENT":
    case "RECEIVED":
      return "success";
    case "FAILED":
      return "danger";
    case "PENDING":
    case "SKIPPED":
      return "warning";
    default:
      return "neutral";
  }
}

export default function WhatsAppIslemKayitlariPage() {
  const mountedRef = useRef(true);
  const abortRef = useRef<AbortController | null>(null);

  const [items, setItems] = useState<BotInteractionLogDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [forbidden, setForbidden] = useState(false);
  const [direction, setDirection] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  useEffect(() => {
    mountedRef.current = true;
    if (!isAdmin()) {
      setForbidden(true);
      setLoading(false);
    }
    return () => {
      mountedRef.current = false;
      abortRef.current?.abort();
    };
  }, []);

  const load = useCallback(async () => {
    if (!isAdmin()) {
      setForbidden(true);
      setLoading(false);
      return;
    }
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);
    setError("");
    setForbidden(false);
    try {
      const res = await botOpsService.getInteractions(
        {
          page,
          size: pageSize,
          direction: direction || undefined,
          status: status || undefined,
        },
        controller.signal
      );
      if (!mountedRef.current || controller.signal.aborted) return;
      setItems(res.content ?? []);
      setTotalElements(res.totalElements ?? 0);
      setTotalPages(res.totalPages ?? 0);
    } catch (err) {
      if (controller.signal.aborted) return;
      const apiErr = err as ApiError;
      if (apiErr.status === 403) {
        setForbidden(true);
      } else if (mountedRef.current) {
        setError(apiErr.message || "Kayıtlar yüklenemedi");
      }
    } finally {
      if (mountedRef.current && !controller.signal.aborted) {
        setLoading(false);
      }
    }
  }, [direction, status, page, pageSize]);

  useEffect(() => {
    if (!forbidden) void load();
  }, [forbidden, load]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="WhatsApp İşlem Kayıtları"
        description="Bot etkileşim özetleri — telefon maskeli, payload yok"
        icon={<MessageSquare className="h-5 w-5" />}
      />

      {forbidden ? (
        <SectionCard title="Yetki Gerekli">
          <EmptyState
            title="Erişim yetkiniz yok"
            description="Bu sayfa yalnız yöneticiler içindir."
          />
        </SectionCard>
      ) : (
        <SectionCard
          title="İşlem kayıtları"
          description="INBOUND / OUTBOUND özetleri"
          noPadding
          action={
            <div className="flex flex-wrap gap-2">
              <Select
                value={direction}
                onChange={(e) => {
                  setPage(0);
                  setDirection(e.target.value);
                }}
                className="h-9 w-36"
              >
                <option value="">Tüm yönler</option>
                <option value="INBOUND">INBOUND</option>
                <option value="OUTBOUND">OUTBOUND</option>
              </Select>
              <Select
                value={status}
                onChange={(e) => {
                  setPage(0);
                  setStatus(e.target.value);
                }}
                className="h-9 w-36"
              >
                <option value="">Tüm durumlar</option>
                <option value="RECEIVED">RECEIVED</option>
                <option value="SENT">SENT</option>
                <option value="FAILED">FAILED</option>
                <option value="SKIPPED">SKIPPED</option>
              </Select>
            </div>
          }
        >
          {error && (
            <div className="px-5 pt-4">
              <ErrorMessage message={error} />
            </div>
          )}

          {loading ? (
            <SkeletonTable rows={8} />
          ) : items.length === 0 ? (
            <EmptyState
              className="py-12"
              title="Kayıt bulunamadı"
              description="Seçilen filtrelere uygun işlem kaydı yok."
            />
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Telefon</TableHead>
                      <TableHead>Yön</TableHead>
                      <TableHead>Durum</TableHead>
                      <TableHead>Olay / Komut</TableHead>
                      <TableHead>Özet hata</TableHead>
                      <TableHead>Tarih</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell className="font-mono text-xs text-slate-600">
                          {row.phoneMasked || "***"}
                        </TableCell>
                        <TableCell>
                          <Badge variant="neutral">{row.direction || "—"}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={statusVariant(row.status)}>
                            {row.status || "—"}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-[14rem] truncate text-sm text-slate-600">
                          {row.eventType || row.command || "—"}
                        </TableCell>
                        <TableCell className="max-w-[12rem] truncate text-xs text-slate-500">
                          {row.errorMessage || "—"}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-slate-500">
                          {formatDateTime(row.createdAt)}
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
      )}
    </div>
  );
}
