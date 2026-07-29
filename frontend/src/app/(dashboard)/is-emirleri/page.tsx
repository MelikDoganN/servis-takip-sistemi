"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ClipboardList,
  LayoutGrid,
  List,
  Plus,
  RefreshCw,
  FileText,
  Upload,
  Paperclip,
} from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { EmptyState } from "@/components/ui/EmptyState";
import { SearchInput } from "@/components/ui/SearchInput";
import { Pagination } from "@/components/ui/Pagination";
import { SectionCard } from "@/components/ui/SectionCard";
import { DetailList } from "@/components/ui/DetailList";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/Table";
import { SkeletonTable } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { customerService } from "@/services/customerService";
import { deviceService } from "@/services/deviceService";
import { technicianService } from "@/services/technicianService";
import { workOrderService } from "@/services/workOrderService";
import { ApiError } from "@/types/api";
import { Customer } from "@/types/customer";
import { Device } from "@/types/device";
import { Technician } from "@/types/technician";
import {
  CreateWorkOrderRequest,
  KanbanBoard,
  ServiceType,
  WORK_ORDER_STATUS_LABELS,
  WORK_ORDER_STATUSES,
  WORK_ORDER_TRANSITIONS,
  WorkOrder,
  WorkOrderAttachment,
  WorkOrderPriority,
  WorkOrderStatus,
  WorkOrderStatusHistory,
} from "@/types/workOrder";
import { formatDateTime } from "@/lib/utils";
import { cn } from "@/lib/utils";
import {
  canManageRecords,
  getAuthEmail,
  isTechnicianOnly,
} from "@/lib/auth";
import { WorkOrderPdfModal } from "@/components/workorders/WorkOrderPdfModal";

type ViewMode = "list" | "kanban";
type ModalMode = "create" | "detail" | "status" | "assign" | "pdf" | null;

function statusBadgeVariant(
  status: WorkOrderStatus
): "default" | "success" | "warning" | "danger" | "info" | "neutral" {
  switch (status) {
    case "OPEN":
      return "warning";
    case "ASSIGNED":
      return "info";
    case "WAITING_PARTS":
      return "default";
    case "RESOLVED":
      return "success";
    case "CLOSED":
      return "neutral";
    default:
      return "neutral";
  }
}

const PRIORITIES: WorkOrderPriority[] = ["LOW", "MEDIUM", "HIGH"];
const SERVICE_TYPES: ServiceType[] = ["WARRANTY", "PAID"];

export default function IsEmirleriPage() {
  const toast = useToast();
  const canCreate = canManageRecords();
  const techOnly = isTechnicianOnly();
  const authEmail = getAuthEmail();

  const [view, setView] = useState<ViewMode>("list");
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [kanban, setKanban] = useState<KanbanBoard>({});
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<WorkOrderStatus | "">("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [selected, setSelected] = useState<WorkOrder | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState("");
  const [nextStatus, setNextStatus] = useState<WorkOrderStatus | "">("");
  const [availableTechnicians, setAvailableTechnicians] = useState<
    Technician[]
  >([]);
  const [assignTechnicianId, setAssignTechnicianId] = useState("");
  const [availableLoading, setAvailableLoading] = useState(false);
  const [history, setHistory] = useState<WorkOrderStatusHistory[]>([]);
  const [attachments, setAttachments] = useState<WorkOrderAttachment[]>([]);
  const [extrasLoading, setExtrasLoading] = useState(false);
  const [uploadLoading, setUploadLoading] = useState(false);

  const [customerId, setCustomerId] = useState("");
  const [deviceId, setDeviceId] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<WorkOrderPriority>("MEDIUM");
  const [serviceType, setServiceType] = useState<ServiceType>("WARRANTY");

  const loadList = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await workOrderService.getAll(1000, statusFilter || undefined);
      setWorkOrders(data);
    } catch (err) {
      const apiErr = err as ApiError;
      setError(apiErr.message || "İş emirleri yüklenemedi");
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  const loadKanban = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await workOrderService.getKanban();
      setKanban(data ?? {});
    } catch (err) {
      const apiErr = err as ApiError;
      setError(apiErr.message || "Kanban verisi yüklenemedi");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadLookups = useCallback(async () => {
    try {
      const [c, d] = await Promise.all([
        customerService.getAll(),
        deviceService.getAll(),
      ]);
      setCustomers(c);
      setDevices(d);
    } catch {
      // create form fallbacks separately
    }
  }, []);

  useEffect(() => {
    loadLookups();
  }, [loadLookups]);

  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get("q");
    if (q) setSearch(q);
  }, []);

  useEffect(() => {
    if (view === "list") {
      void loadList();
    } else {
      void loadKanban();
    }
  }, [view, loadList, loadKanban]);

  const filtered = useMemo(() => {
    let list = workOrders;
    if (techOnly && authEmail) {
      list = list.filter(
        (wo) =>
          wo.technician?.user?.email?.toLowerCase() === authEmail.toLowerCase()
      );
    }
    const q = search.toLowerCase().trim();
    if (!q) return list;
    return list.filter((wo) => {
      return (
        wo.description?.toLowerCase().includes(q) ||
        wo.customer?.fullName?.toLowerCase().includes(q) ||
        wo.device?.serialNumber?.toLowerCase().includes(q) ||
        wo.technician?.user?.fullName?.toLowerCase().includes(q) ||
        wo.status?.toLowerCase().includes(q) ||
        (WORK_ORDER_STATUS_LABELS[wo.status] ?? "").toLowerCase().includes(q)
      );
    });
  }, [workOrders, search, techOnly, authEmail]);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, pageSize]);

  const totalPages = Math.ceil(filtered.length / pageSize) || 0;
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  const devicesForCustomer = useMemo(() => {
    if (!customerId) return devices;
    return devices.filter((d) => String(d.customer?.id) === customerId);
  }, [devices, customerId]);

  const refresh = () => {
    if (view === "list") void loadList();
    else void loadKanban();
  };

  const closeModal = () => {
    setModalMode(null);
    setSelected(null);
    setActionError("");
    setNextStatus("");
    setAvailableTechnicians([]);
    setAssignTechnicianId("");
    setHistory([]);
    setAttachments([]);
    setCustomerId("");
    setDeviceId("");
    setDescription("");
    setPriority("MEDIUM");
    setServiceType("WARRANTY");
  };

  const openCreate = () => {
    setActionError("");
    setModalMode("create");
  };

  const openDetail = async (id: number) => {
    setModalMode("detail");
    setDetailLoading(true);
    setExtrasLoading(true);
    setActionError("");
    setHistory([]);
    setAttachments([]);
    try {
      const data = await workOrderService.getById(id);
      setSelected(data);
      try {
        const [hist, files] = await Promise.all([
          workOrderService.getHistory(id),
          workOrderService.getAttachments(id),
        ]);
        setHistory(Array.isArray(hist) ? hist : []);
        setAttachments(Array.isArray(files) ? files : []);
      } catch {
        setHistory([]);
        setAttachments([]);
      } finally {
        setExtrasLoading(false);
      }
    } catch (err) {
      const apiErr = err as ApiError;
      setActionError(apiErr.message || "Detay yüklenemedi");
      setExtrasLoading(false);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleUpload = async (file: File | null) => {
    if (!selected || !file) return;
    setUploadLoading(true);
    setActionError("");
    try {
      const saved = await workOrderService.uploadFile(selected.id, file);
      setAttachments((prev) => [saved, ...prev]);
      toast.success("Dosya yüklendi");
    } catch (err) {
      const apiErr = err as ApiError;
      setActionError(apiErr.message || "Dosya yüklenemedi");
    } finally {
      setUploadLoading(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!selected) return;
    setModalMode("pdf");
  };

  const openStatus = (wo: WorkOrder) => {
    setSelected(wo);
    const allowed = WORK_ORDER_TRANSITIONS[wo.status] ?? [];
    setNextStatus(allowed[0] ?? "");
    setActionError("");
    setModalMode("status");
  };

  const openAssign = async (wo: WorkOrder) => {
    setSelected(wo);
    setAssignTechnicianId("");
    setActionError("");
    setModalMode("assign");
    setAvailableLoading(true);
    try {
      const list = await technicianService.getAvailable(5);
      setAvailableTechnicians(list);
      if (list.length > 0) {
        setAssignTechnicianId(String(list[0].id));
      }
    } catch (err) {
      const apiErr = err as ApiError;
      setActionError(apiErr.message || "Müsait teknisyenler yüklenemedi");
      setAvailableTechnicians([]);
    } finally {
      setAvailableLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError("");

    if (!customerId || !deviceId) {
      setActionError("Müşteri ve cihaz zorunludur");
      return;
    }

    const trimmedDescription = description.trim();
    if (!trimmedDescription) {
      setActionError("Açıklama zorunludur");
      return;
    }

    const payload: CreateWorkOrderRequest = {
      customer: { id: Number(customerId) },
      device: { id: Number(deviceId) },
      description: trimmedDescription,
      priority,
      serviceType,
    };

    setActionLoading(true);
    try {
      await workOrderService.create(payload);
      toast.success("İş emri oluşturuldu");
      closeModal();
      refresh();
    } catch (err) {
      const apiErr = err as ApiError;
      setActionError(apiErr.message || "Oluşturma başarısız");
    } finally {
      setActionLoading(false);
    }
  };

  const handleStatusUpdate = async () => {
    if (!selected || !nextStatus) return;
    setActionLoading(true);
    setActionError("");
    try {
      await workOrderService.updateStatus(selected.id, nextStatus);
      toast.success("Durum güncellendi");
      closeModal();
      refresh();
    } catch (err) {
      const apiErr = err as ApiError;
      setActionError(apiErr.message || "Durum güncellenemedi");
    } finally {
      setActionLoading(false);
    }
  };

  const handleAssign = async () => {
    if (!selected || !assignTechnicianId) return;
    setActionLoading(true);
    setActionError("");
    try {
      await workOrderService.assign(selected.id, Number(assignTechnicianId));
      toast.success("Teknisyen atandı");
      closeModal();
      refresh();
    } catch (err) {
      const apiErr = err as ApiError;
      setActionError(apiErr.message || "Atama başarısız");
    } finally {
      setActionLoading(false);
    }
  };

  const canAssign = (wo: WorkOrder) => wo.status !== "CLOSED";

  return (
    <div className="space-y-6 sm:space-y-8">
      <PageHeader
        title="İş Emirleri"
        description="Servis taleplerini takip edin ve yönetin"
        icon={<ClipboardList className="h-5 w-5" />}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1 shadow-soft">
              <Button
                type="button"
                size="sm"
                variant={view === "list" ? "primary" : "ghost"}
                onClick={() => setView("list")}
              >
                <List className="mr-1.5 h-4 w-4" />
                Liste
              </Button>
              <Button
                type="button"
                size="sm"
                variant={view === "kanban" ? "primary" : "ghost"}
                onClick={() => setView("kanban")}
              >
                <LayoutGrid className="mr-1.5 h-4 w-4" />
                Kanban
              </Button>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={refresh}>
              <RefreshCw className="mr-1.5 h-4 w-4" />
              Yenile
            </Button>
            {canCreate && (
              <Button type="button" onClick={openCreate}>
                <Plus className="mr-1.5 h-4 w-4" />
                Yeni İş Emri
              </Button>
            )}
          </div>
        }
      />

      {error && <ErrorMessage message={error} />}

      {view === "list" && (
        <SectionCard
          title="İş Emri Listesi"
          description="Duruma göre filtreleyin ve işlem yapın"
          action={
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <SearchInput
                value={search}
                onChange={setSearch}
                placeholder="Ara (müşteri, seri no, açıklama…)"
              />
              <select
                className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 shadow-soft"
                value={statusFilter}
                onChange={(e) =>
                  setStatusFilter(e.target.value as WorkOrderStatus | "")
                }
              >
                <option value="">Tüm durumlar</option>
                {WORK_ORDER_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {WORK_ORDER_STATUS_LABELS[s]}
                  </option>
                ))}
              </select>
            </div>
          }
        >
          {loading ? (
            <SkeletonTable rows={6} />
          ) : filtered.length === 0 ? (
            <EmptyState
              title="İş emri bulunamadı"
              description="Yeni bir iş emri oluşturarak başlayabilirsiniz"
            />
          ) : (
            <>
              <div className="hidden overflow-x-auto md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Müşteri</TableHead>
                      <TableHead>Cihaz</TableHead>
                      <TableHead>Teknisyen</TableHead>
                      <TableHead>Durum</TableHead>
                      <TableHead>Öncelik</TableHead>
                      <TableHead>Oluşturma</TableHead>
                      <TableHead>İşlem</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginated.map((wo) => (
                      <TableRow key={wo.id}>
                        <TableCell className="font-medium text-slate-900">
                          {wo.customer?.fullName || "—"}
                        </TableCell>
                        <TableCell>
                          {wo.device?.serialNumber || "—"}
                        </TableCell>
                        <TableCell>
                          {wo.technician?.user?.fullName || "—"}
                        </TableCell>
                        <TableCell>
                          <Badge variant={statusBadgeVariant(wo.status)}>
                            {WORK_ORDER_STATUS_LABELS[wo.status] ?? wo.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{wo.priority || "—"}</TableCell>
                        <TableCell>{formatDateTime(wo.createdAt)}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => openDetail(wo.id)}
                            >
                              Detay
                            </Button>
                            {canCreate && canAssign(wo) && (
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => openAssign(wo)}
                              >
                                Ata
                              </Button>
                            )}
                            {(WORK_ORDER_TRANSITIONS[wo.status]?.length ?? 0) >
                              0 && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openStatus(wo)}
                              >
                                Durum
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="space-y-3 md:hidden">
                {paginated.map((wo) => (
                  <div
                    key={wo.id}
                    className="rounded-xl border border-slate-200 bg-white p-4 shadow-soft"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-slate-900">
                          {wo.customer?.fullName || "Müşteri yok"}
                        </p>
                        <p className="text-sm text-slate-600">
                          {wo.device?.serialNumber || "—"}
                        </p>
                        <p className="mt-1 text-xs text-slate-400">
                          {wo.technician?.user?.fullName || "Teknisyen atanmadı"} ·{" "}
                          {formatDateTime(wo.createdAt)}
                        </p>
                      </div>
                      <Badge variant={statusBadgeVariant(wo.status)}>
                        {WORK_ORDER_STATUS_LABELS[wo.status] ?? wo.status}
                      </Badge>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => openDetail(wo.id)}
                      >
                        Detay
                      </Button>
                      {canCreate && canAssign(wo) && (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => openAssign(wo)}
                        >
                          Ata
                        </Button>
                      )}
                      {(WORK_ORDER_TRANSITIONS[wo.status]?.length ?? 0) > 0 && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openStatus(wo)}
                        >
                          Durum
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <Pagination
                currentPage={page}
                totalPages={totalPages}
                totalItems={filtered.length}
                pageSize={pageSize}
                onPageChange={setPage}
                onPageSizeChange={setPageSize}
              />
            </>
          )}
        </SectionCard>
      )}

      {view === "kanban" && (
        <SectionCard
          title="Kanban"
          description="İş emirlerini duruma göre görüntüleyin"
        >
          {loading ? (
            <SkeletonTable rows={4} />
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
              {WORK_ORDER_STATUSES.map((status) => {
                let items = kanban[status] ?? [];
                if (techOnly && authEmail) {
                  items = items.filter(
                    (wo) =>
                      wo.technician?.user?.email?.toLowerCase() ===
                      authEmail.toLowerCase()
                  );
                }
                return (
                  <div
                    key={status}
                    className="flex min-h-[16rem] flex-col rounded-xl border border-slate-200 bg-slate-50/80"
                  >
                    <div className="flex items-center justify-between border-b border-slate-200 px-3 py-2.5">
                      <span className="text-sm font-semibold text-slate-800">
                        {WORK_ORDER_STATUS_LABELS[status]}
                      </span>
                      <Badge variant={statusBadgeVariant(status)}>
                        {items.length}
                      </Badge>
                    </div>
                    <div className="flex-1 space-y-2 overflow-y-auto p-2">
                      {items.length === 0 ? (
                        <p className="px-1 py-6 text-center text-xs text-slate-400">
                          Boş
                        </p>
                      ) : (
                        items.map((wo) => (
                          <button
                            key={wo.id}
                            type="button"
                            onClick={() => openDetail(wo.id)}
                            className={cn(
                              "w-full rounded-lg border border-slate-200 bg-white p-3 text-left shadow-soft",
                              "transition hover:border-primary-200 hover:shadow-card"
                            )}
                          >
                            <p className="text-sm font-semibold text-slate-900">
                              {wo.customer?.fullName || "Müşteri yok"}
                            </p>
                            <p className="mt-0.5 truncate text-xs text-slate-600">
                              {wo.device?.serialNumber || "—"}
                            </p>
                            <p className="mt-1 truncate text-xs text-slate-400">
                              {wo.technician?.user?.fullName || "Atanmadı"} ·{" "}
                              {wo.priority || "—"}
                            </p>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </SectionCard>
      )}

      <Modal
        isOpen={modalMode === "create"}
        onClose={closeModal}
        title="Yeni İş Emri"
        size="lg"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          {actionError && <ErrorMessage message={actionError} />}

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Müşteri
            </label>
            <select
              className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm"
              value={customerId}
              onChange={(e) => {
                setCustomerId(e.target.value);
                setDeviceId("");
              }}
              required
            >
              <option value="">Seçin</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.fullName}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Cihaz
            </label>
            <select
              className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm"
              value={deviceId}
              onChange={(e) => setDeviceId(e.target.value)}
              required
              disabled={!customerId}
            >
              <option value="">Seçin</option>
              {devicesForCustomer.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.serialNumber}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Açıklama
            </label>
            <textarea
              className="min-h-[88px] w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Öncelik
              </label>
              <select
                className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm"
                value={priority}
                onChange={(e) =>
                  setPriority(e.target.value as WorkOrderPriority)
                }
              >
                {PRIORITIES.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Servis Tipi
              </label>
              <select
                className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm"
                value={serviceType}
                onChange={(e) =>
                  setServiceType(e.target.value as ServiceType)
                }
              >
                {SERVICE_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={closeModal}>
              İptal
            </Button>
            <Button type="submit" loading={actionLoading}>
              Oluştur
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={modalMode === "detail"}
        onClose={closeModal}
        title={
          selected?.customer?.fullName
            ? `İş Emri — ${selected.customer.fullName}`
            : "İş Emri Detayı"
        }
        size="lg"
      >
        {detailLoading ? (
          <p className="text-sm text-slate-500">Yükleniyor…</p>
        ) : actionError && !selected ? (
          <ErrorMessage message={actionError} />
        ) : selected ? (
          <div className="space-y-4">
            {actionError && <ErrorMessage message={actionError} />}
            <DetailList
              items={[
                {
                  label: "Durum",
                  value: (
                    <Badge variant={statusBadgeVariant(selected.status)}>
                      {WORK_ORDER_STATUS_LABELS[selected.status] ??
                        selected.status}
                    </Badge>
                  ),
                },
                { label: "Müşteri", value: selected.customer?.fullName || "—" },
                {
                  label: "Cihaz",
                  value: selected.device?.serialNumber || "—",
                },
                {
                  label: "Teknisyen",
                  value: selected.technician?.user?.fullName || "Atanmadı",
                },
                {
                  label: "Oluşturan",
                  value: selected.createdBy?.fullName || "—",
                },
                { label: "Öncelik", value: selected.priority || "—" },
                { label: "Servis Tipi", value: selected.serviceType || "—" },
                {
                  label: "Açıklama",
                  value: selected.description || "—",
                },
                {
                  label: "Oluşturma",
                  value: formatDateTime(selected.createdAt),
                },
                {
                  label: "Atama",
                  value: formatDateTime(selected.assignedAt),
                },
                {
                  label: "Tamamlanma",
                  value: formatDateTime(selected.completedAt),
                },
                {
                  label: "Kapanış",
                  value: formatDateTime(selected.closedAt),
                },
              ]}
            />
            {(WORK_ORDER_TRANSITIONS[selected.status]?.length ?? 0) > 0 ||
            canAssign(selected) ? (
              <div className="flex flex-wrap justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void handleDownloadPdf()}
                >
                  <FileText className="mr-1.5 h-4 w-4" />
                  PDF Görüntüle
                </Button>
                {canCreate && canAssign(selected) && (
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => openAssign(selected)}
                  >
                    Teknisyen Ata
                  </Button>
                )}
                {(WORK_ORDER_TRANSITIONS[selected.status]?.length ?? 0) > 0 && (
                  <Button
                    type="button"
                    onClick={() => {
                      const allowed =
                        WORK_ORDER_TRANSITIONS[selected.status] ?? [];
                      setNextStatus(allowed[0] ?? "");
                      setModalMode("status");
                    }}
                  >
                    Durum Değiştir
                  </Button>
                )}
              </div>
            ) : (
              <div className="flex justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void handleDownloadPdf()}
                >
                  <FileText className="mr-1.5 h-4 w-4" />
                  PDF Görüntüle
                </Button>
              </div>
            )}

            <div className="space-y-3 border-t border-slate-100 pt-4">
              <div className="flex items-center justify-between gap-2">
                <h4 className="text-sm font-semibold text-slate-800">
                  Dosya Yükle
                </h4>
                <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-soft hover:bg-slate-50">
                  <Upload className="h-3.5 w-3.5" />
                  {uploadLoading ? "Yükleniyor…" : "Dosya seç"}
                  <input
                    type="file"
                    className="hidden"
                    disabled={uploadLoading}
                    onChange={(e) => {
                      const file = e.target.files?.[0] ?? null;
                      void handleUpload(file);
                      e.target.value = "";
                    }}
                  />
                </label>
              </div>

              {extrasLoading ? (
                <p className="text-xs text-slate-500">Ekler yükleniyor…</p>
              ) : attachments.length === 0 ? (
                <p className="text-xs text-slate-400">Henüz dosya yok</p>
              ) : (
                <ul className="space-y-2">
                  {attachments.map((a) => (
                    <li
                      key={a.id}
                      className="flex items-center gap-2 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-sm"
                    >
                      <Paperclip className="h-4 w-4 shrink-0 text-slate-400" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-slate-800">
                          {a.fileName}
                        </p>
                        <p className="text-xs text-slate-400">
                          {formatDateTime(a.createdAt)}
                          {a.fileSize != null
                            ? ` · ${Math.round(a.fileSize / 1024)} KB`
                            : ""}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="space-y-3 border-t border-slate-100 pt-4">
              <h4 className="text-sm font-semibold text-slate-800">
                Durum Geçmişi
              </h4>
              {extrasLoading ? (
                <p className="text-xs text-slate-500">Geçmiş yükleniyor…</p>
              ) : history.length === 0 ? (
                <p className="text-xs text-slate-400">Geçmiş kaydı yok</p>
              ) : (
                <ul className="max-h-48 space-y-2 overflow-y-auto">
                  {history.map((h) => (
                    <li
                      key={h.id}
                      className="rounded-lg border border-slate-100 bg-white px-3 py-2 text-sm shadow-soft"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge
                          variant={statusBadgeVariant(
                            (h.newStatus as WorkOrderStatus) || "OPEN"
                          )}
                        >
                          {WORK_ORDER_STATUS_LABELS[
                            h.newStatus as WorkOrderStatus
                          ] ?? h.newStatus}
                        </Badge>
                        <span className="text-xs text-slate-400">
                          {formatDateTime(h.createdAt)}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-slate-600">
                        {h.description ||
                          `${h.oldStatus ?? "—"} → ${h.newStatus}`}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        ) : null}
      </Modal>

      <Modal
        isOpen={modalMode === "status"}
        onClose={closeModal}
        title={
          selected?.customer?.fullName
            ? `Durum Değiştir — ${selected.customer.fullName}`
            : "Durum Değiştir"
        }
      >
        {selected && (
          <div className="space-y-4">
            {actionError && <ErrorMessage message={actionError} />}
            <p className="text-sm text-slate-600">
              Mevcut:{" "}
              <Badge variant={statusBadgeVariant(selected.status)}>
                {WORK_ORDER_STATUS_LABELS[selected.status]}
              </Badge>
            </p>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Yeni durum
              </label>
              <select
                className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm"
                value={nextStatus}
                onChange={(e) =>
                  setNextStatus(e.target.value as WorkOrderStatus)
                }
              >
                {(WORK_ORDER_TRANSITIONS[selected.status] ?? []).map((s) => (
                  <option key={s} value={s}>
                    {WORK_ORDER_STATUS_LABELS[s]}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={closeModal}>
                İptal
              </Button>
              <Button
                type="button"
                loading={actionLoading}
                disabled={!nextStatus}
                onClick={handleStatusUpdate}
              >
                Kaydet
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        isOpen={modalMode === "assign"}
        onClose={closeModal}
        title={
          selected?.customer?.fullName
            ? `Teknisyen Ata — ${selected.customer.fullName}`
            : "Teknisyen Ata"
        }
        size="lg"
      >
        {selected && (
          <div className="space-y-4">
            {actionError && <ErrorMessage message={actionError} />}
            <p className="text-sm text-slate-600">
              İş emri: <strong>{selected.customer?.fullName || "—"}</strong> ·{" "}
              {selected.device?.serialNumber || "—"} ·{" "}
              <Badge variant={statusBadgeVariant(selected.status)}>
                {WORK_ORDER_STATUS_LABELS[selected.status]}
              </Badge>
            </p>

            {availableLoading ? (
              <p className="text-sm text-slate-500">
                Müsait teknisyenler yükleniyor…
              </p>
            ) : availableTechnicians.length === 0 ? (
              <EmptyState
                title="Müsait teknisyen yok"
                description="Şu an atama yapılabilecek müsait teknisyen bulunmuyor"
              />
            ) : (
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Müsait teknisyenler
                </label>
                <select
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm"
                  value={assignTechnicianId}
                  onChange={(e) => setAssignTechnicianId(e.target.value)}
                >
                  {availableTechnicians.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.user?.fullName || "İsimsiz"} (yük:{" "}
                      {t.currentWorkload ?? 0}
                      {t.region?.name ? `, ${t.region.name}` : ""})
                    </option>
                  ))}
                </select>
                <ul className="mt-3 max-h-40 space-y-1 overflow-y-auto rounded-xl border border-slate-100 bg-slate-50 p-3 text-xs text-slate-600">
                  {availableTechnicians.map((t) => (
                    <li key={t.id}>
                      <button
                        type="button"
                        className={cn(
                          "w-full rounded-lg px-2 py-1.5 text-left transition",
                          String(t.id) === assignTechnicianId
                            ? "bg-primary-50 text-primary-800"
                            : "hover:bg-white"
                        )}
                        onClick={() => setAssignTechnicianId(String(t.id))}
                      >
                        <span className="font-medium">
                          {t.user?.fullName || "Teknisyen"}
                        </span>
                        {" · "}yük {t.currentWorkload ?? 0}
                        {t.whatsappNumber ? ` · ${t.whatsappNumber}` : ""}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={closeModal}>
                İptal
              </Button>
              <Button
                type="button"
                loading={actionLoading}
                disabled={!assignTechnicianId || availableLoading}
                onClick={handleAssign}
              >
                Ata
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <WorkOrderPdfModal
        isOpen={modalMode === "pdf"}
        onClose={() => setModalMode("detail")}
        workOrder={selected}
        history={history}
        attachments={attachments}
      />
    </div>
  );
}
