"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  Activity,
  CheckCircle2,
  Eye,
  History,
  LogIn,
  MessageSquare,
  XCircle,
} from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import {
  Badge,
  Button,
  DetailList,
  Drawer,
  EmptyState,
  ErrorMessage,
  KpiCard,
  Pagination,
  SearchInput,
  SectionCard,
  Select,
  SkeletonTable,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui";
import { auditLogService } from "@/services/auditLogService";
import { AuditLog } from "@/types/auditLog";
import { ApiError } from "@/types/api";
import { isAdmin } from "@/lib/auth";
import { formatDateTime } from "@/lib/utils";
import {
  AUDIT_ACTION_OPTIONS,
  AUDIT_ENTITY_TYPE_OPTIONS,
  AUDIT_SOURCE_OPTIONS,
  auditActionLabel,
  auditEntityHref,
  auditEntityTypeLabel,
  auditSourceLabel,
  isSameLocalDay,
  localDateInputValue,
  sanitizeAuditMetadata,
} from "@/lib/auditLabels";

type SuccessFilter = "" | "true" | "false";

export default function HareketGecmisiPage() {
  const mountedRef = useRef(true);
  const abortRef = useRef<AbortController | null>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [items, setItems] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [forbidden, setForbidden] = useState(false);

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [action, setAction] = useState("");
  const [entityType, setEntityType] = useState("");
  const [source, setSource] = useState("");
  const [success, setSuccess] = useState<SuccessFilter>("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const [selected, setSelected] = useState<AuditLog | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    mountedRef.current = true;
    if (!isAdmin()) {
      setForbidden(true);
      setLoading(false);
    }
    return () => {
      mountedRef.current = false;
      abortRef.current?.abort();
      if (searchTimer.current) clearTimeout(searchTimer.current);
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
    try {
      const res = await auditLogService.getPage(
        {
          page,
          size: pageSize,
          action: action || undefined,
          entityType: entityType || undefined,
          source: source || undefined,
          success: success === "" ? undefined : success === "true",
          dateFrom: dateFrom || undefined,
          dateTo: dateTo || undefined,
          search: search || undefined,
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
        setError("Hareket geçmişi yüklenemedi.");
      }
    } finally {
      if (mountedRef.current && !controller.signal.aborted) {
        setLoading(false);
      }
    }
  }, [page, pageSize, action, entityType, source, success, dateFrom, dateTo, search]);

  useEffect(() => {
    if (!forbidden) void load();
  }, [forbidden, load]);

  const onSearchChange = (value: string) => {
    setSearchInput(value);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setPage(0);
      setSearch(value.trim());
    }, 350);
  };

  const resetFilters = () => {
    setSearchInput("");
    setSearch("");
    setAction("");
    setEntityType("");
    setSource("");
    setSuccess("");
    setDateFrom("");
    setDateTo("");
    setPage(0);
  };

  const openDetail = async (row: AuditLog) => {
    setSelected(row);
    setDetailLoading(true);
    try {
      const fresh = await auditLogService.getById(row.id);
      if (mountedRef.current) setSelected(fresh);
    } catch {
      // liste satırı yeterli
    } finally {
      if (mountedRef.current) setDetailLoading(false);
    }
  };

  const pageKpis = useMemo(() => {
    const today = localDateInputValue();
    const todays = items.filter((i) => isSameLocalDay(i.createdAt, today));
    return {
      today: todays.length,
      success: items.filter((i) => i.success).length,
      failed: items.filter((i) => !i.success).length,
      whatsapp: items.filter((i) => (i.source || "").toUpperCase() === "WHATSAPP").length,
      login: items.filter((i) =>
        ["LOGIN_SUCCESS", "LOGIN_FAILED"].includes((i.action || "").toUpperCase())
      ).length,
    };
  }, [items]);

  const sourceBadgeVariant = (
    src: string | null
  ): "default" | "success" | "warning" | "danger" | "info" | "neutral" => {
    switch ((src || "").toUpperCase()) {
      case "WEB":
        return "info";
      case "WHATSAPP":
        return "default";
      case "SYSTEM":
        return "neutral";
      default:
        return "neutral";
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Hareket Geçmişi"
        description="Sistemde gerçekleşen önemli işlemleri, kullanıcı hareketlerini ve bildirim olaylarını inceleyin."
        icon={<History className="h-5 w-5" />}
      />

      {forbidden ? (
        <SectionCard title="Yetki Gerekli">
          <EmptyState
            title="Bu sayfayı görüntüleme yetkiniz bulunmuyor."
            description="Hareket geçmişi yalnız yöneticiler içindir."
          />
        </SectionCard>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <KpiCard
              label="Bugünkü Hareket"
              value={pageKpis.today}
              icon={<Activity className="h-5 w-5 text-accent-strong" />}
              iconBg="bg-accent-soft"
              description="Bu sayfadaki kayıtlar"
            />
            <KpiCard
              label="Başarılı"
              value={pageKpis.success}
              icon={<CheckCircle2 className="h-5 w-5 text-emerald-600" />}
              iconBg="bg-emerald-50"
              description="Bu sayfadaki kayıtlar"
            />
            <KpiCard
              label="Başarısız"
              value={pageKpis.failed}
              icon={<XCircle className="h-5 w-5 text-red-600" />}
              iconBg="bg-red-50"
              description="Bu sayfadaki kayıtlar"
            />
            <KpiCard
              label="WhatsApp Olayı"
              value={pageKpis.whatsapp}
              icon={<MessageSquare className="h-5 w-5 text-sky-600" />}
              iconBg="bg-sky-50"
              description="Bu sayfadaki kayıtlar"
            />
            <KpiCard
              label="Giriş İşlemi"
              value={pageKpis.login}
              icon={<LogIn className="h-5 w-5 text-navy" />}
              iconBg="bg-slate-100"
              description="Bu sayfadaki kayıtlar"
            />
          </div>

          <SectionCard
            title="Filtreler"
            description="Arama ve filtreler sunucu tarafında uygulanır"
            action={
              <Button type="button" variant="outline" size="sm" onClick={resetFilters}>
                Sıfırla
              </Button>
            }
          >
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              <SearchInput
                value={searchInput}
                onChange={onSearchChange}
                placeholder="Kullanıcı, e-posta, servis no, açıklama…"
                className="md:col-span-2 xl:col-span-3"
              />
              <Select
                value={action}
                onChange={(e) => {
                  setPage(0);
                  setAction(e.target.value);
                }}
              >
                <option value="">Tüm işlemler</option>
                {AUDIT_ACTION_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </Select>
              <Select
                value={entityType}
                onChange={(e) => {
                  setPage(0);
                  setEntityType(e.target.value);
                }}
              >
                <option value="">Tüm varlıklar</option>
                {AUDIT_ENTITY_TYPE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </Select>
              <Select
                value={source}
                onChange={(e) => {
                  setPage(0);
                  setSource(e.target.value);
                }}
              >
                <option value="">Tüm kaynaklar</option>
                {AUDIT_SOURCE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </Select>
              <Select
                value={success}
                onChange={(e) => {
                  setPage(0);
                  setSuccess(e.target.value as SuccessFilter);
                }}
              >
                <option value="">Başarı (tümü)</option>
                <option value="true">Başarılı</option>
                <option value="false">Başarısız</option>
              </Select>
              <label className="flex flex-col gap-1.5 text-sm text-slate-600">
                <span className="text-xs font-medium uppercase tracking-wide text-slate-400">
                  Tarih başlangıcı
                </span>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => {
                    setPage(0);
                    setDateFrom(e.target.value);
                  }}
                  className="field-base"
                />
              </label>
              <label className="flex flex-col gap-1.5 text-sm text-slate-600">
                <span className="text-xs font-medium uppercase tracking-wide text-slate-400">
                  Tarih bitişi
                </span>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => {
                    setPage(0);
                    setDateTo(e.target.value);
                  }}
                  className="field-base"
                />
              </label>
            </div>
          </SectionCard>

          <SectionCard title="Hareketler" description={`${totalElements} kayıt`} noPadding>
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
                title="Seçilen filtrelere uygun hareket bulunamadı."
                description="Filtreleri değiştirerek tekrar deneyin."
              />
            ) : (
              <>
                {/* Desktop table */}
                <div className="hidden overflow-x-auto md:block">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tarih/Saat</TableHead>
                        <TableHead>Kullanıcı</TableHead>
                        <TableHead>İşlem</TableHead>
                        <TableHead>Açıklama</TableHead>
                        <TableHead>Varlık</TableHead>
                        <TableHead>Kaynak</TableHead>
                        <TableHead>Sonuç</TableHead>
                        <TableHead className="text-right">Detay</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {items.map((row) => (
                        <TableRow
                          key={row.id}
                          className="cursor-pointer"
                          onClick={() => void openDetail(row)}
                        >
                          <TableCell className="whitespace-nowrap text-slate-500">
                            {formatDateTime(row.createdAt)}
                          </TableCell>
                          <TableCell>
                            <div className="min-w-[8rem]">
                              <p className="font-medium text-navy">
                                {row.actorName || "Sistem"}
                              </p>
                              <p className="text-xs text-slate-400">
                                {row.actorRole || "—"}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm font-medium text-slate-700">
                            {auditActionLabel(row.action)}
                          </TableCell>
                          <TableCell className="max-w-[18rem] text-sm text-slate-600">
                            <span className="line-clamp-2">{row.description}</span>
                          </TableCell>
                          <TableCell className="font-mono text-xs text-slate-600">
                            {row.entityDisplay || "—"}
                          </TableCell>
                          <TableCell>
                            <Badge variant={sourceBadgeVariant(row.source)}>
                              {auditSourceLabel(row.source)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={row.success ? "success" : "danger"}>
                              {row.success ? "Başarılı" : "Başarısız"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                void openDetail(row);
                              }}
                              aria-label="Detay"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Mobile cards */}
                <div className="space-y-3 p-4 md:hidden">
                  {items.map((row) => (
                    <button
                      key={row.id}
                      type="button"
                      onClick={() => void openDetail(row)}
                      className="w-full rounded-xl border border-slate-200 bg-white p-4 text-left shadow-card"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-xs text-slate-400">{formatDateTime(row.createdAt)}</p>
                        <Badge variant={row.success ? "success" : "danger"}>
                          {row.success ? "Başarılı" : "Başarısız"}
                        </Badge>
                      </div>
                      <p className="mt-2 text-sm font-semibold text-navy">
                        {auditActionLabel(row.action)}
                      </p>
                      <p className="mt-1 text-sm text-slate-600 line-clamp-2">{row.description}</p>
                      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                        <span>{row.actorName || "Sistem"}</span>
                        <span>·</span>
                        <Badge variant={sourceBadgeVariant(row.source)}>
                          {auditSourceLabel(row.source)}
                        </Badge>
                        {row.entityDisplay && (
                          <>
                            <span>·</span>
                            <span className="font-mono">{row.entityDisplay}</span>
                          </>
                        )}
                      </div>
                    </button>
                  ))}
                </div>

                <Pagination
                  currentPage={page + 1}
                  totalPages={totalPages}
                  totalItems={totalElements}
                  pageSize={pageSize}
                  pageSizeOptions={[10, 25, 50]}
                  onPageChange={(p) => setPage(p - 1)}
                  onPageSizeChange={(size) => {
                    setPage(0);
                    setPageSize(size);
                  }}
                />
              </>
            )}
          </SectionCard>
        </>
      )}

      <Drawer
        isOpen={!!selected}
        onClose={() => setSelected(null)}
        title="Hareket Detayı"
        widthClassName="max-w-lg"
        footer={
          selected && auditEntityHref(selected) ? (
            <Link
              href={auditEntityHref(selected)!}
              className="inline-flex h-10 items-center rounded-xl bg-navy px-4 text-sm font-medium text-white hover:bg-navy-soft"
              onClick={() => setSelected(null)}
            >
              {selected.entityType?.toUpperCase() === "WORK_ORDER"
                ? "Servis kaydına git"
                : selected.entityType?.toUpperCase() === "CUSTOMER"
                  ? "Müşteriye git"
                  : selected.entityType?.toUpperCase() === "TECHNICIAN"
                    ? "Teknisyene git"
                    : "Kayıda git"}
            </Link>
          ) : null
        }
      >
        {selected && (
          <div className="space-y-5">
            {detailLoading && (
              <p className="text-xs text-slate-400">Detay güncelleniyor…</p>
            )}
            <DetailList
              items={[
                { label: "Tarih/Saat", value: formatDateTime(selected.createdAt) },
                { label: "Kullanıcı", value: selected.actorName || "Sistem" },
                { label: "E-posta", value: selected.actorEmail || "—" },
                { label: "Rol", value: selected.actorRole || "—" },
                { label: "İşlem", value: auditActionLabel(selected.action) },
                {
                  label: "Kaynak",
                  value: (
                    <Badge variant={sourceBadgeVariant(selected.source)}>
                      {auditSourceLabel(selected.source)}
                    </Badge>
                  ),
                },
                {
                  label: "Sonuç",
                  value: (
                    <Badge variant={selected.success ? "success" : "danger"}>
                      {selected.success ? "Başarılı" : "Başarısız"}
                    </Badge>
                  ),
                },
                { label: "Varlık Türü", value: auditEntityTypeLabel(selected.entityType) },
                { label: "Varlık ID", value: selected.entityId ?? "—" },
                { label: "Varlık", value: selected.entityDisplay || "—" },
                { label: "Açıklama", value: selected.description },
                { label: "IP", value: selected.ipAddress || "—" },
              ]}
            />

            <div>
              <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-400">
                Metadata
              </h3>
              {sanitizeAuditMetadata(selected.metadata).length === 0 ? (
                <p className="text-sm text-slate-400">Ek bilgi yok</p>
              ) : (
                <ul className="divide-y divide-slate-100 rounded-xl border border-slate-100">
                  {sanitizeAuditMetadata(selected.metadata).map((m) => (
                    <li
                      key={m.key}
                      className="flex flex-col gap-0.5 px-3.5 py-2.5 sm:flex-row sm:items-start sm:justify-between sm:gap-4"
                    >
                      <span className="text-xs font-medium text-slate-400">{m.key}</span>
                      <span className="break-all text-sm font-medium text-navy sm:text-right">
                        {m.value}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
}
