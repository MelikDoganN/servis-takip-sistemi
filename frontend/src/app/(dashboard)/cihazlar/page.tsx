"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { EmptyState } from "@/components/ui/EmptyState";
import { SearchInput } from "@/components/ui/SearchInput";
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
import { Eye, Pencil, Trash2, MonitorSmartphone } from "lucide-react";

type ViewMode = "table" | "grid";
type ModalMode = "create" | "edit" | "detail" | "delete" | null;

export default function CihazlarPage() {
  const toast = useToast();
  const [devices, setDevices] = useState<Device[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("table");

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
    setSuccess("Cihaz başarıyla eklendi.");
    toast.success("Cihaz başarıyla eklendi.");
    closeModal();
    await fetchData();
  };

  const handleUpdate = async (data: CreateDeviceRequest) => {
    if (selectedId == null) return;
    await deviceService.update(selectedId, data);
    setSuccess("Cihaz başarıyla güncellendi.");
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
      setSuccess("Cihaz silindi.");
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
    <div className="flex flex-wrap justify-end gap-1">
      <Button variant="ghost" size="sm" onClick={() => openDetail(device.id)} title="Detay">
        <Eye className="h-3.5 w-3.5" />
        <span className="hidden lg:inline">Detay</span>
      </Button>
      <Button variant="outline" size="sm" onClick={() => openEdit(device.id)} title="Düzenle">
        <Pencil className="h-3.5 w-3.5" />
        <span className="hidden lg:inline">Düzenle</span>
      </Button>
      <Button variant="danger" size="sm" onClick={() => openDelete(device.id)} title="Sil">
        <Trash2 className="h-3.5 w-3.5" />
        <span className="hidden lg:inline">Sil</span>
      </Button>
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
    <div className="space-y-6 sm:space-y-8">
      <PageHeader
        title="Cihazlar"
        description="Kayıtlı cihazları görüntüleyin ve yönetin"
        icon={<MonitorSmartphone className="h-5 w-5" />}
        action={
          <Button onClick={() => setModalMode("create")} disabled={customers.length === 0}>
            Yeni Cihaz
          </Button>
        }
      />

      {success && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 shadow-soft animate-slide-up">
          {success}
          <button type="button" className="ml-3 underline" onClick={() => setSuccess("")}>
            Kapat
          </button>
        </div>
      )}

      <SectionCard title="Cihaz Envanteri" noPadding>
        <div className="flex flex-col gap-4 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Seri no, müşteri veya marka ara..."
            className="max-w-md flex-1"
          />
          <div className="flex rounded-lg border border-slate-200 p-1">
            <button
              type="button"
              onClick={() => setViewMode("table")}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                viewMode === "table" ? "bg-primary-600 text-white" : "text-slate-600 hover:bg-slate-50"
              )}
            >
              Tablo
            </button>
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                viewMode === "grid" ? "bg-primary-600 text-white" : "text-slate-600 hover:bg-slate-50"
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
        ) : viewMode === "table" ? (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Seri No</TableHead>
                  <TableHead>Marka / Model</TableHead>
                  <TableHead>Müşteri</TableHead>
                  <TableHead>Satın Alma</TableHead>
                  <TableHead>Kurulum</TableHead>
                  <TableHead className="text-right">İşlemler</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((device) => (
                  <TableRow key={device.id}>
                    <TableCell className="font-medium text-slate-900">{device.serialNumber}</TableCell>
                    <TableCell>
                      {device.model?.brand?.name ?? "—"} / {device.model?.name ?? "—"}
                    </TableCell>
                    <TableCell>{device.customer?.fullName || "—"}</TableCell>
                    <TableCell>{formatDate(device.purchaseDate)}</TableCell>
                    <TableCell>{formatDate(device.installationDate)}</TableCell>
                    <TableCell>{actionButtons(device)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2 xl:grid-cols-3">
            {filtered.map((device) => (
              <div key={device.id} className="surface-card card-hover overflow-hidden">
                <div className="flex h-28 items-center justify-center bg-gradient-to-br from-slate-100 to-slate-50">
                  <svg className="h-12 w-12 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1}
                      d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                    />
                  </svg>
                </div>
                <div className="space-y-3 p-4">
                  <div>
                    <p className="font-semibold text-slate-900">{device.serialNumber}</p>
                    <p className="mt-1 text-sm text-slate-500">
                      {device.model?.brand?.name} {device.model?.name}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">{device.customer?.fullName}</p>
                    <p className="mt-1 text-xs text-slate-400">
                      Kurulum: {formatDate(device.installationDate)}
                    </p>
                  </div>
                  {actionButtons(device)}
                </div>
              </div>
            ))}
          </div>
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
                { label: "ID", value: detail.id },
                { label: "Seri No", value: detail.serialNumber },
                { label: "Satın Alma", value: formatDate(detail.purchaseDate) },
                { label: "Kurulum", value: formatDate(detail.installationDate) },
                { label: "Müşteri ID", value: detail.customer?.id ?? "—" },
                { label: "Müşteri", value: detail.customer?.fullName || "—" },
                { label: "Müşteri Telefon", value: detail.customer?.phone || "—" },
                { label: "Model ID", value: detail.model?.id ?? "—" },
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
