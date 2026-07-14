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
import { CustomerForm } from "@/components/forms/CustomerForm";
import { customerService } from "@/services/customerService";
import { Customer, CreateCustomerRequest } from "@/types/customer";
import { ApiError } from "@/types/api";
import { formatDateTime } from "@/lib/utils";
import { useToast } from "@/components/ui/Toast";
import { SkeletonTable } from "@/components/ui/Skeleton";
import { Eye, Pencil, Trash2, Users } from "lucide-react";

const PAGE_SIZE = 10;

type ModalMode = "create" | "edit" | "detail" | "delete" | null;

export default function MusterilerPage() {
  const toast = useToast();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "withEmail" | "withPhone">("all");
  const [page, setPage] = useState(1);

  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [detail, setDetail] = useState<Customer | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState("");

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await customerService.getAll();
      setCustomers(data);
    } catch (err) {
      const apiErr = err as ApiError;
      setError(apiErr.message || "Müşteriler yüklenemedi");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const filtered = useMemo(() => {
    return customers.filter((c) => {
      const q = search.toLowerCase();
      const matchesSearch =
        !q ||
        c.fullName.toLowerCase().includes(q) ||
        c.phone?.toLowerCase().includes(q) ||
        c.whatsappNumber?.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q);

      const matchesFilter =
        filter === "all" ||
        (filter === "withEmail" && !!c.email) ||
        (filter === "withPhone" && !!c.phone);

      return matchesSearch && matchesFilter;
    });
  }, [customers, search, filter]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE) || 0;
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => {
    setPage(1);
  }, [search, filter]);

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
      const data = await customerService.getById(id);
      setDetail(data);
    } catch (err) {
      const apiErr = err as ApiError;
      setDetailError(apiErr.message || "Müşteri detayı yüklenemedi");
    } finally {
      setDetailLoading(false);
    }
  };

  const openEdit = async (id: number) => {
    setModalMode("edit");
    setSelectedId(id);
    setDetail(null);
    setDetailError("");
    setActionError("");
    setDetailLoading(true);
    try {
      const data = await customerService.getById(id);
      setDetail(data);
    } catch (err) {
      const apiErr = err as ApiError;
      setDetailError(apiErr.message || "Müşteri bilgileri yüklenemedi");
    } finally {
      setDetailLoading(false);
    }
  };

  const openDelete = (id: number) => {
    setModalMode("delete");
    setSelectedId(id);
    setActionError("");
    setDetail(customers.find((c) => c.id === id) ?? null);
  };

  const handleCreate = async (data: CreateCustomerRequest) => {
    await customerService.create(data);
    setSuccess("Müşteri başarıyla eklendi.");
    toast.success("Müşteri başarıyla eklendi.");
    closeModal();
    await fetchCustomers();
  };

  const handleUpdate = async (data: CreateCustomerRequest) => {
    if (selectedId == null) return;
    await customerService.update(selectedId, data);
    setSuccess("Müşteri başarıyla güncellendi.");
    toast.success("Müşteri başarıyla güncellendi.");
    closeModal();
    await fetchCustomers();
  };

  const handleDelete = async () => {
    if (selectedId == null) return;
    setActionLoading(true);
    setActionError("");
    try {
      await customerService.delete(selectedId);
      setSuccess("Müşteri silindi.");
      toast.success("Müşteri silindi.");
      closeModal();
      await fetchCustomers();
    } catch (err) {
      const apiErr = err as ApiError;
      setActionError(apiErr.message || "Müşteri silinemedi");
      toast.error(apiErr.message || "Müşteri silinemedi");
    } finally {
      setActionLoading(false);
    }
  };

  const modalTitle =
    modalMode === "create"
      ? "Yeni Müşteri"
      : modalMode === "edit"
        ? "Müşteri Düzenle"
        : modalMode === "detail"
          ? "Müşteri Detayı"
          : modalMode === "delete"
            ? "Müşteri Sil"
            : "";

  return (
    <div className="space-y-6 sm:space-y-8">
      <PageHeader
        title="Müşteriler"
        description="Müşteri portföyünüzü yönetin ve takip edin"
        icon={<Users className="h-5 w-5" />}
        action={
          <Button onClick={() => setModalMode("create")}>
            Yeni Müşteri
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

      <SectionCard title="Müşteri Listesi" noPadding>
        <div className="flex flex-col gap-4 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Ad, telefon veya e-posta ara..."
            className="flex-1"
          />
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as typeof filter)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
          >
            <option value="all">Tüm Müşteriler</option>
            <option value="withEmail">E-postası Olanlar</option>
            <option value="withPhone">Telefonu Olanlar</option>
          </select>
        </div>

        {loading ? (
          <SkeletonTable rows={6} />
        ) : error ? (
          <div className="p-5">
            <ErrorMessage message={error} />
          </div>
        ) : paginated.length === 0 ? (
          <EmptyState
            title={customers.length === 0 ? "Henüz müşteri kaydı yok" : "Sonuç bulunamadı"}
            description={
              customers.length === 0
                ? "İlk müşteri kaydınızı oluşturarak başlayın"
                : "Arama veya filtre kriterlerinizi değiştirmeyi deneyin"
            }
            action={
              customers.length === 0 ? (
                <Button onClick={() => setModalMode("create")}>İlk Müşteriyi Ekle</Button>
              ) : undefined
            }
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ad Soyad</TableHead>
                    <TableHead>Telefon</TableHead>
                    <TableHead>WhatsApp</TableHead>
                    <TableHead>E-posta</TableHead>
                    <TableHead>Oluşturulma</TableHead>
                    <TableHead>Adres</TableHead>
                    <TableHead className="text-right">İşlemler</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginated.map((customer) => (
                    <TableRow key={customer.id}>
                      <TableCell className="font-medium text-slate-900">{customer.fullName}</TableCell>
                      <TableCell>{customer.phone || "—"}</TableCell>
                      <TableCell>{customer.whatsappNumber || "—"}</TableCell>
                      <TableCell>{customer.email || "—"}</TableCell>
                      <TableCell className="whitespace-nowrap text-xs text-slate-500">
                        {formatDateTime(customer.createdAt)}
                      </TableCell>
                      <TableCell className="max-w-[10rem] truncate">{customer.address || "—"}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap justify-end gap-1">
                          <Button variant="ghost" size="sm" onClick={() => openDetail(customer.id)} title="Detay">
                            <Eye className="h-3.5 w-3.5" />
                            <span className="hidden lg:inline">Detay</span>
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => openEdit(customer.id)} title="Düzenle">
                            <Pencil className="h-3.5 w-3.5" />
                            <span className="hidden lg:inline">Düzenle</span>
                          </Button>
                          <Button variant="danger" size="sm" onClick={() => openDelete(customer.id)} title="Sil">
                            <Trash2 className="h-3.5 w-3.5" />
                            <span className="hidden lg:inline">Sil</span>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <Pagination
              currentPage={page}
              totalPages={totalPages}
              totalItems={filtered.length}
              pageSize={PAGE_SIZE}
              onPageChange={setPage}
            />
          </>
        )}
      </SectionCard>

      <Modal isOpen={modalMode !== null} onClose={closeModal} title={modalTitle} size="md">
        {modalMode === "create" && (
          <CustomerForm onSubmit={handleCreate} onCancel={closeModal} submitLabel="Kaydet" />
        )}

        {modalMode === "edit" &&
          (detailLoading ? (
            <LoadingSpinner className="mx-auto my-8" />
          ) : detailError ? (
            <ErrorMessage message={detailError} />
          ) : detail ? (
            <CustomerForm
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
                { label: "Ad Soyad", value: detail.fullName },
                { label: "Telefon", value: detail.phone || "—" },
                { label: "WhatsApp", value: detail.whatsappNumber || "—" },
                { label: "E-posta", value: detail.email || "—" },
                { label: "Adres", value: detail.address || "—" },
                { label: "Oluşturulma", value: formatDateTime(detail.createdAt) },
                { label: "Güncellenme", value: formatDateTime(detail.updatedAt) },
              ]}
            />
          ) : null)}

        {modalMode === "delete" && (
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              <strong>{detail?.fullName ?? "Bu müşteri"}</strong> kaydını silmek istediğinize emin
              misiniz? Bu işlem geri alınamaz.
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
