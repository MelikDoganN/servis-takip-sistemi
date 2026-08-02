"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Pencil, Plus, Trash2, Wrench } from "lucide-react";
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
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
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
import { technicianService } from "@/services/technicianService";
import { regionService } from "@/services/regionService";
import { ApiError } from "@/types/api";
import {
  CreateTechnicianRequest,
  Technician,
  UpdateTechnicianRequest,
} from "@/types/technician";
import { Region } from "@/types/region";
import { roleLabel } from "@/types/role";
import { formatDateTime } from "@/lib/utils";
import {
  canDeleteRecords,
  canManageRecords,
  isTechnicianOnly,
} from "@/lib/auth";

type ModalMode = "create" | "edit" | "detail" | "delete" | null;

interface FormState {
  fullName: string;
  email: string;
  phone: string;
  password: string;
  regionId: string;
  whatsappNumber: string;
  currentWorkload: string;
  isAvailable: boolean;
}

const emptyForm: FormState = {
  fullName: "",
  email: "",
  phone: "",
  password: "",
  regionId: "",
  whatsappNumber: "",
  currentWorkload: "0",
  isAvailable: true,
};

export default function TeknisyenlerPage() {
  const toast = useToast();
  const canManage = canManageRecords() && !isTechnicianOnly();
  const canDelete = canDeleteRecords();

  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [regions, setRegions] = useState<Region[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [selected, setSelected] = useState<Technician | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState("");
  const [detailLoading, setDetailLoading] = useState(false);
  const [lookupsLoading, setLookupsLoading] = useState(false);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await technicianService.getAll();
      setTechnicians(data);
    } catch (err) {
      const apiErr = err as ApiError;
      setError(apiErr.message || "Teknisyenler yüklenemedi");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadRegions = useCallback(async () => {
    setLookupsLoading(true);
    try {
      const regionData = await regionService.getAll().catch(() => [] as Region[]);
      setRegions(regionData);
    } finally {
      setLookupsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchAll();
  }, [fetchAll]);

  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get("q");
    if (q) setSearch(q);
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return technicians;
    return technicians.filter((t) => {
      return (
        t.user?.fullName?.toLowerCase().includes(q) ||
        t.user?.email?.toLowerCase().includes(q) ||
        t.user?.phone?.toLowerCase().includes(q) ||
        t.whatsappNumber?.toLowerCase().includes(q) ||
        t.region?.name?.toLowerCase().includes(q)
      );
    });
  }, [technicians, search]);

  useEffect(() => {
    setPage(1);
  }, [search, pageSize]);

  const totalPages = Math.ceil(filtered.length / pageSize) || 0;
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  const closeModal = () => {
    setModalMode(null);
    setSelected(null);
    setForm(emptyForm);
    setActionError("");
  };

  const openCreate = async () => {
    setForm(emptyForm);
    setActionError("");
    setModalMode("create");
    await loadRegions();
  };

  const openEdit = async (id: number) => {
    setModalMode("edit");
    setDetailLoading(true);
    setActionError("");
    try {
      await loadRegions();
      const data = await technicianService.getById(id);
      setSelected(data);
      setForm({
        fullName: data.user?.fullName ?? "",
        email: data.user?.email ?? "",
        phone: data.user?.phone ?? "",
        password: "",
        regionId: data.region?.id ? String(data.region.id) : "",
        whatsappNumber: data.whatsappNumber ?? "",
        currentWorkload: String(data.currentWorkload ?? 0),
        isAvailable: data.isAvailable ?? true,
      });
    } catch (err) {
      const apiErr = err as ApiError;
      setActionError(apiErr.message || "Teknisyen yüklenemedi");
    } finally {
      setDetailLoading(false);
    }
  };

  const openDetail = async (id: number) => {
    setModalMode("detail");
    setDetailLoading(true);
    setActionError("");
    try {
      const data = await technicianService.getById(id);
      setSelected(data);
    } catch (err) {
      const apiErr = err as ApiError;
      setActionError(apiErr.message || "Detay yüklenemedi");
    } finally {
      setDetailLoading(false);
    }
  };

  const openDelete = (tech: Technician) => {
    setSelected(tech);
    setActionError("");
    setModalMode("delete");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError("");

    if (modalMode === "create") {
      if (!form.fullName.trim()) {
        setActionError("Ad soyad zorunludur");
        return;
      }
      if (!form.email.trim()) {
        setActionError("E-posta zorunludur");
        return;
      }
      if (!form.password.trim() || form.password.length < 6) {
        setActionError("Şifre en az 6 karakter olmalıdır");
        return;
      }

      const payload: CreateTechnicianRequest = {
        fullName: form.fullName.trim(),
        email: form.email.trim(),
        password: form.password,
        phone: form.phone.trim() || undefined,
        whatsappNumber: form.whatsappNumber.trim() || undefined,
        currentWorkload: Number(form.currentWorkload) || 0,
        isAvailable: form.isAvailable,
        regionId: form.regionId.trim() ? Number(form.regionId) : null,
      };

      setActionLoading(true);
      try {
        await technicianService.create(payload);
        toast.success("Teknisyen oluşturuldu");
        closeModal();
        await fetchAll();
      } catch (err) {
        const apiErr = err as ApiError;
        setActionError(apiErr.message || "İşlem başarısız");
      } finally {
        setActionLoading(false);
      }
      return;
    }

    if (modalMode === "edit" && selected) {
      const payload: UpdateTechnicianRequest = {
        user: selected.user?.id ? { id: selected.user.id } : undefined,
        whatsappNumber: form.whatsappNumber.trim() || undefined,
        currentWorkload: Number(form.currentWorkload) || 0,
        isAvailable: form.isAvailable,
        region: form.regionId.trim()
          ? { id: Number(form.regionId) }
          : null,
      };

      setActionLoading(true);
      try {
        await technicianService.update(selected.id, payload);
        toast.success("Teknisyen güncellendi");
        closeModal();
        await fetchAll();
      } catch (err) {
        const apiErr = err as ApiError;
        setActionError(apiErr.message || "İşlem başarısız");
      } finally {
        setActionLoading(false);
      }
    }
  };

  const handleDelete = async () => {
    if (!selected) return;
    setActionLoading(true);
    setActionError("");
    try {
      await technicianService.delete(selected.id);
      toast.success("Teknisyen silindi");
      closeModal();
      await fetchAll();
    } catch (err) {
      const apiErr = err as ApiError;
      setActionError(apiErr.message || "Silme başarısız");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-5 sm:space-y-6">
      <PageHeader
        title="Teknisyenler"
        description="Saha teknisyenlerini yönetin"
        icon={<Wrench className="h-5 w-5" />}
        action={
          canManage ? (
            <Button type="button" onClick={() => void openCreate()}>
              <Plus className="mr-1.5 h-4 w-4" />
              Yeni Teknisyen
            </Button>
          ) : undefined
        }
      />

      {error && <ErrorMessage message={error} />}

      <SectionCard
        title="Teknisyen Listesi"
        description="Kullanıcı hesabına bağlı teknisyen kayıtları"
        action={
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Ara (ad, telefon, bölge…)"
          />
        }
      >
        {loading ? (
          <SkeletonTable rows={6} />
        ) : filtered.length === 0 ? (
          <EmptyState
            title="Teknisyen bulunamadı"
            description="Yeni bir teknisyen kaydı oluşturarak başlayın"
          />
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ad Soyad</TableHead>
                    <TableHead>Telefon</TableHead>
                    <TableHead>Bölge</TableHead>
                    <TableHead>İş Yükü</TableHead>
                    <TableHead>Durum</TableHead>
                    <TableHead>İşlemler</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginated.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell className="font-medium text-slate-900">
                        {t.user?.fullName || "—"}
                      </TableCell>
                      <TableCell>
                        {t.whatsappNumber || t.user?.phone || "—"}
                      </TableCell>
                      <TableCell>{t.region?.name || "—"}</TableCell>
                      <TableCell>{t.currentWorkload ?? 0}</TableCell>
                      <TableCell>
                        <Badge variant={t.isAvailable ? "success" : "neutral"}>
                          {t.isAvailable ? "Müsait" : "Meşgul"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => openDetail(t.id)}
                            title="Detay"
                          >
                            Detay
                          </Button>
                          {canManage && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openEdit(t.id)}
                              title="Düzenle"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          {canDelete && (
                            <Button
                              size="sm"
                              variant="danger"
                              onClick={() => openDelete(t)}
                              title="Sil"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
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
              {paginated.map((t) => (
                <div
                  key={t.id}
                  className="rounded-xl border border-slate-200 bg-white p-4 shadow-soft"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-slate-900">
                        {t.user?.fullName || "Teknisyen"}
                      </p>
                      <p className="text-xs text-slate-500">
                        {t.whatsappNumber || t.user?.phone || "—"}
                      </p>
                      <p className="mt-1 text-xs text-slate-400">
                        İş yükü: {t.currentWorkload ?? 0} ·{" "}
                        {t.region?.name || "Bölge yok"}
                      </p>
                    </div>
                    <Badge variant={t.isAvailable ? "success" : "neutral"}>
                      {t.isAvailable ? "Müsait" : "Meşgul"}
                    </Badge>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => openDetail(t.id)}
                    >
                      Detay
                    </Button>
                    {canManage && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openEdit(t.id)}
                      >
                        Düzenle
                      </Button>
                    )}
                    {canDelete && (
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => openDelete(t)}
                      >
                        Sil
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

      <Modal
        isOpen={modalMode === "create" || modalMode === "edit"}
        onClose={closeModal}
        title={
          modalMode === "create" ? "Yeni Teknisyen" : "Teknisyen Düzenle"
        }
        size="lg"
      >
        {detailLoading || lookupsLoading ? (
          <p className="text-sm text-slate-500">Yükleniyor…</p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {actionError && <ErrorMessage message={actionError} />}

            {modalMode === "create" ? (
              <>
                <Input
                  label="Ad Soyad"
                  required
                  value={form.fullName}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, fullName: e.target.value }))
                  }
                />
                <Input
                  label="E-posta"
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, email: e.target.value }))
                  }
                />
                <Input
                  label="Telefon"
                  value={form.phone}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, phone: e.target.value }))
                  }
                />
                <Input
                  label="Şifre"
                  type="password"
                  required
                  minLength={6}
                  value={form.password}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, password: e.target.value }))
                  }
                  hint="Kullanıcı hesabı otomatik TECHNICIAN rolü ile oluşturulur."
                />
              </>
            ) : (
              <div className="grid grid-cols-1 gap-3 rounded-xl border border-slate-100 bg-slate-50/80 p-4 sm:grid-cols-2">
                <div>
                  <p className="text-xs text-slate-400">Ad Soyad</p>
                  <p className="text-sm font-medium text-slate-800">
                    {form.fullName || "—"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">E-posta</p>
                  <p className="text-sm font-medium text-slate-800">
                    {form.email || "—"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Telefon</p>
                  <p className="text-sm font-medium text-slate-800">
                    {form.phone || "—"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Rol</p>
                  <p className="text-sm font-medium text-slate-800">
                    {roleLabel(selected?.user?.role?.name) || "Teknisyen"}
                  </p>
                </div>
              </div>
            )}

            <Select
              label="Bölge"
              value={form.regionId}
              onChange={(e) =>
                setForm((f) => ({ ...f, regionId: e.target.value }))
              }
            >
              <option value="">Bölge seçin (opsiyonel)…</option>
              {regions.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </Select>

            <Input
              label="WhatsApp"
              value={form.whatsappNumber}
              onChange={(e) =>
                setForm((f) => ({ ...f, whatsappNumber: e.target.value }))
              }
              placeholder="WhatsApp numarası"
            />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                label="İş Yükü"
                type="number"
                min={0}
                value={form.currentWorkload}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    currentWorkload: e.target.value,
                  }))
                }
              />
              <div className="flex items-end pb-1">
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={form.isAvailable}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        isAvailable: e.target.checked,
                      }))
                    }
                    className="h-4 w-4 rounded border-slate-300 text-accent focus:ring-accent"
                  />
                  Müsait
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={closeModal}>
                İptal
              </Button>
              <Button type="submit" loading={actionLoading}>
                {modalMode === "create" ? "Oluştur" : "Kaydet"}
              </Button>
            </div>
          </form>
        )}
      </Modal>

      <Modal
        isOpen={modalMode === "detail"}
        onClose={closeModal}
        title={
          selected?.user?.fullName
            ? selected.user.fullName
            : "Teknisyen Detayı"
        }
        size="lg"
      >
        {detailLoading ? (
          <p className="text-sm text-slate-500">Yükleniyor…</p>
        ) : actionError && !selected ? (
          <ErrorMessage message={actionError} />
        ) : selected ? (
          <DetailList
            items={[
              { label: "Ad Soyad", value: selected.user?.fullName || "—" },
              { label: "E-posta", value: selected.user?.email || "—" },
              { label: "Telefon", value: selected.user?.phone || "—" },
              {
                label: "Rol",
                value: roleLabel(selected.user?.role?.name),
              },
              { label: "Bölge", value: selected.region?.name || "—" },
              {
                label: "WhatsApp",
                value: selected.whatsappNumber || "—",
              },
              {
                label: "İş Yükü",
                value: String(selected.currentWorkload ?? 0),
              },
              {
                label: "Durum",
                value: selected.isAvailable ? "Müsait" : "Meşgul",
              },
              {
                label: "Oluşturma",
                value: formatDateTime(selected.createdAt),
              },
            ]}
          />
        ) : null}
      </Modal>

      <Modal
        isOpen={modalMode === "delete"}
        onClose={closeModal}
        title="Teknisyen Sil"
      >
        {selected && (
          <div className="space-y-4">
            {actionError && <ErrorMessage message={actionError} />}
            <p className="text-sm text-slate-600">
              <strong>{selected.user?.fullName || "Bu teknisyen"}</strong>{" "}
              kaydını silmek istediğinize emin misiniz?
            </p>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={closeModal}>
                İptal
              </Button>
              <Button
                type="button"
                variant="danger"
                loading={actionLoading}
                onClick={handleDelete}
              >
                Sil
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
