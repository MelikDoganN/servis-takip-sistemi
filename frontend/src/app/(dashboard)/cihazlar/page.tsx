"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { EmptyState } from "@/components/ui/EmptyState";
import { SearchInput } from "@/components/ui/SearchInput";
import { Pagination } from "@/components/ui/Pagination";
import { SectionCard } from "@/components/ui/SectionCard";
import { DetailList } from "@/components/ui/DetailList";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/Table";
import { DeviceForm } from "@/components/forms/DeviceForm";
import { deviceService } from "@/services/deviceService";
import { customerService } from "@/services/customerService";
import { Device, CreateDeviceRequest } from "@/types/device";
import { Customer } from "@/types/customer";
import { ApiError } from "@/types/api";
import { cn, formatDate, formatDateTime } from "@/lib/utils";
import { useToast } from "@/components/ui/Toast";
import { SkeletonTable } from "@/components/ui/Skeleton";
import { Badge } from "@/components/ui/Badge";
import { Eye, Pencil, Trash2, MonitorSmartphone } from "lucide-react";
import { canDeleteRecords, canManageRecords } from "@/lib/auth";

type ViewMode = "table" | "grid";
type ModalMode = "create" | "edit" | "detail" | "delete" | null;

function deviceWarrantyLabel(device: Device): {
  text: string;
  variant: "success" | "danger" | "warning" | "neutral";
} {
  const months = device.model?.generalWarrantyMonths;
  const start = device.purchaseDate || device.installationDate;
  if (months == null || months <= 0) {
    return { text: "Tanımlı değil", variant: "neutral" };
  }
  if (!start) {
    return { text: "Tarih eksik", variant: "warning" };
  }
  const end = new Date(start);
  if (Number.isNaN(end.getTime())) {
    return { text: "—", variant: "neutral" };
  }
  end.setMonth(end.getMonth() + months);
  const active = end.getTime() >= Date.now();
  return active
    ? { text: "Aktif", variant: "success" }
    : { text: "Süresi dolmuş", variant: "danger" };
}

export default function CihazlarPage() {
  const toast = useToast();
  const canManage = canManageRecords();
  const canDelete = canDeleteRecords();
  const [devices, setDevices] = useState<Device[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("table");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [detail, setDetail] = useState<Device | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [deviceData, customerData] = await Promise.all([
        deviceService.getAll(),
        customerService.getAll(),
      ]);
      setDevices(deviceData);
      setCustomers(customerData);
    } catch (err) {
      const apiErr = err as ApiError;
      setError(apiErr.message || "Cihazlar yüklenemedi");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get("q");
    if (q) setSearch(q);
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return devices;
    return devices.filter(
      (d) =>
        d.serialNumber.toLowerCase().includes(q) ||
        d.customer?.fullName?.toLowerCase().includes(q) ||
        d.model?.name?.toLowerCase().includes(q) ||
        d.model?.brand?.name?.toLowerCase().includes(q)
    );
  }, [devices, search]);

  useEffect(() => {
    setPage(1);
  }, [search, pageSize]);

  const totalPages = Math.ceil(filtered.length / pageSize) || 0;
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  const closeModal = () => {
    setModalMode(null);
    setSelectedId(null);
    setDetail(null);
    setDetailError("");
    setActionError("");
  };

  const openDetail = async (id: number) => {
    setModalMode("detail");
    setSelectedId(id);
    setDetail(null);
    setDetailError("");
    setDetailLoading(true);
    try {
      const data = await deviceService.getById(id);
      setDetail(data);
    } catch (err) {
      const apiErr = err as ApiError;
      setDetailError(apiErr.message || "Cihaz detayı yüklenemedi");
    } finally {
      setDetailLoading(false);
    }
  };

  const openEdit = async (id: number) => {
    setModalMode("edit");
    setSelectedId(id);
    setDetail(null);
    setDetailError("");
    setDetailLoading(true);
    try {
      const data = await deviceService.getById(id);
      setDetail(data);
    } catch (err) {
      const apiErr = err as ApiError;
      setDetailError(apiErr.message || "Cihaz bilgileri yüklenemedi");
    } finally {
      setDetailLoading(false);
    }
  };

  const openDelete = (id: number) => {
    setModalMode("delete");
    setSelectedId(id);
    setActionError("");
    setDetail(devices.find((d) => d.id === id) ?? null);
  };

  const handleCreate = async (data: CreateDeviceRequest) => {
    await deviceService.create(data);
    toast.success("Cihaz başarıyla eklendi.");
    closeModal();
    await fetchData();
  };

  const handleUpdate = async (data: CreateDeviceRequest) => {
    if (selectedId == null) return;
    await deviceService.update(selectedId, data);
    toast.success("Cihaz başarıyla güncellendi.");
    closeModal();
    await fetchData();
  };

  const handleDelete = async () => {
    if (selectedId == null) return;
    setActionLoading(true);
    setActionError("");
    try {
      await deviceService.delete(selectedId);
      toast.success("Cihaz silindi.");
      closeModal();
      await fetchData();
    } catch (err) {
      const apiErr = err as ApiError;
      setActionError(apiErr.message || "Cihaz silinemedi");
      toast.error(apiErr.message || "Cihaz silinemedi");
    } finally {
      setActionLoading(false);
    }
  };

  const actionButtons = (device: Device) => (
    <div className="flex justify-end gap-1">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => openDetail(device.id)}
        title="Detay"
        aria-label="Cihaz detayı"
        className="!px-2"
      >
        <Eye className="h-3.5 w-3.5" />
      </Button>
      {canManage && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => openEdit(device.id)}
          title="Düzenle"
          aria-label="Cihaz düzenle"
          className="!px-2"
        >
          <Pencil className="h-3.5 w-3.5" />
        </Button>
      )}
      {canDelete && (
        <Button
          variant="danger"
          size="sm"
          onClick={() => openDelete(device.id)}
          title="Sil"
          aria-label="Cihaz sil"
          className="!px-2"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      )}
    </div>
  );

  const modalTitle =
    modalMode === "create"
      ? "Yeni Cihaz"
      : modalMode === "edit"
        ? "Cihaz Düzenle"
        : modalMode === "detail"
          ? "Cihaz Detayı"
          : modalMode === "delete"
            ? "Cihaz Sil"
            : "";

  return (
    <div className="space-y-5 sm:space-y-6">
      <PageHeader
        title="Cihazlar"
        description="Kayıtlı cihazları görüntüleyin ve yönetin"
        icon={<MonitorSmartphone className="h-5 w-5" />}
        action={
          canManage ? (
            <Button onClick={() => setModalMode("create")} disabled={customers.length === 0}>
              Yeni Cihaz
            </Button>
          ) : undefined
        }
      />

      <SectionCard title="Cihaz Envanteri" noPadding>
        <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Seri no, müşteri veya marka ara..."
            className="max-w-md flex-1"
          />
          <div className="flex rounded-xl border border-slate-200 p-1">
            <button
              type="button"
              onClick={() => setViewMode("table")}
              className={cn(
                "rounded-lg px-3 py-1.5 text-xs font-medium transition",
                viewMode === "table" ? "bg-navy text-white" : "text-slate-600 hover:bg-slate-50"
              )}
            >
              Tablo
            </button>
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              className={cn(
                "rounded-lg px-3 py-1.5 text-xs font-medium transition",
                viewMode === "grid" ? "bg-navy text-white" : "text-slate-600 hover:bg-slate-50"
              )}
            >
              Kart
            </button>
          </div>
        </div>

        {loading ? (
          <SkeletonTable rows={6} />
        ) : error ? (
          <div className="p-5">
            <ErrorMessage message={error} />
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            title={devices.length === 0 ? "Henüz cihaz kaydı yok" : "Sonuç bulunamadı"}
            description={
              devices.length === 0
                ? "Sisteme kayıtlı cihazlar burada listelenecek"
                : "Arama kriterinizi değiştirmeyi deneyin"
            }
          />
        ) : (
          <>
            {viewMode === "table" ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Müşteri</TableHead>
                    <TableHead>Marka</TableHead>
                    <TableHead>Model</TableHead>
                    <TableHead>Seri No</TableHead>
                    <TableHead>Satın Alma</TableHead>
                    <TableHead>Kurulum</TableHead>
                    <TableHead>Garanti</TableHead>
                    <TableHead className="text-right">İşlemler</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginated.map((device) => {
                    const warranty = deviceWarrantyLabel(device);
                    return (
                      <TableRow key={device.id}>
                        <TableCell className="font-medium text-navy">
                          {device.customer?.fullName || "—"}
                        </TableCell>
                        <TableCell>{device.model?.brand?.name ?? "—"}</TableCell>
                        <TableCell>{device.model?.name ?? "—"}</TableCell>
                        <TableCell>{device.serialNumber || "—"}</TableCell>
                        <TableCell>{formatDate(device.purchaseDate)}</TableCell>
                        <TableCell>{formatDate(device.installationDate)}</TableCell>
                        <TableCell>
                          <Badge variant={warranty.variant}>{warranty.text}</Badge>
                        </TableCell>
                        <TableCell>{actionButtons(device)}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            ) : (
              <div className="grid grid-cols-1 gap-3 p-5 sm:grid-cols-2 xl:grid-cols-3">
                {paginated.map((device) => (
                  <div key={device.id} className="surface-card overflow-hidden">
                    <div className="flex h-20 items-center justify-center bg-slate-50">
                      <MonitorSmartphone className="h-8 w-8 text-slate-300" />
                    </div>
                    <div className="space-y-3 p-4">
                      <div>
                        <p className="font-semibold text-navy">{device.serialNumber}</p>
                        <p className="mt-1 text-sm text-slate-500">
                          {device.model?.brand?.name} {device.model?.name}
                        </p>
                        <p className="mt-1 text-xs text-slate-400">{device.customer?.fullName}</p>
                      </div>
                      {actionButtons(device)}
                    </div>
                  </div>
                ))}
              </div>
            )}
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

      <Modal isOpen={modalMode !== null} onClose={closeModal} title={modalTitle} size="lg">
        {modalMode === "create" &&
          (customers.length === 0 ? (
            <EmptyState
              title="Önce müşteri ekleyin"
              description="Cihaz kaydı oluşturmak için en az bir müşteri gereklidir"
            />
          ) : (
            <DeviceForm customers={customers} onSubmit={handleCreate} onCancel={closeModal} />
          ))}

        {modalMode === "edit" &&
          (detailLoading ? (
            <LoadingSpinner className="mx-auto my-8" />
          ) : detailError ? (
            <ErrorMessage message={detailError} />
          ) : detail ? (
            <DeviceForm
              customers={customers}
              initialValues={detail}
              onSubmit={handleUpdate}
              onCancel={closeModal}
              submitLabel="Güncelle"
            />
          ) : null)}

        {modalMode === "detail" &&
          (detailLoading ? (
            <LoadingSpinner className="mx-auto my-8" />
          ) : detailError ? (
            <ErrorMessage message={detailError} />
          ) : detail ? (
            <DetailList
              items={[
                { label: "Seri No", value: detail.serialNumber },
                { label: "Satın Alma", value: formatDate(detail.purchaseDate) },
                { label: "Kurulum", value: formatDate(detail.installationDate) },
                { label: "Müşteri", value: detail.customer?.fullName || "—" },
                { label: "Müşteri Telefon", value: detail.customer?.phone || "—" },
                { label: "Model", value: detail.model?.name || "—" },
                { label: "Marka", value: detail.model?.brand?.name || "—" },
                { label: "Oluşturulma", value: formatDateTime(detail.createdAt) },
                { label: "Güncellenme", value: formatDateTime(detail.updatedAt) },
              ]}
            />
          ) : null)}

        {modalMode === "delete" && (
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              <strong>{detail?.serialNumber ?? "Bu cihaz"}</strong> kaydını silmek istediğinize emin
              misiniz? İlişkili garanti kayıtları varsa işlem reddedilebilir.
            </p>
            {actionError && <ErrorMessage message={actionError} />}
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={closeModal} disabled={actionLoading}>
                İptal
              </Button>
              <Button variant="danger" loading={actionLoading} onClick={handleDelete}>
                Evet, Sil
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
