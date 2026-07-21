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
import { technicianService } from "@/services/technicianService";
import { ApiError } from "@/types/api";
import {
  CreateTechnicianRequest,
  Technician,
  UpdateTechnicianRequest,
} from "@/types/technician";
import { formatDateTime } from "@/lib/utils";

type ModalMode = "create" | "edit" | "detail" | "delete" | null;

interface FormState {
  userId: string;
  regionId: string;
  whatsappNumber: string;
  currentWorkload: string;
  isAvailable: boolean;
}

const emptyForm: FormState = {
  userId: "",
  regionId: "",
  whatsappNumber: "",
  currentWorkload: "0",
  isAvailable: true,
};

function toPayload(form: FormState): CreateTechnicianRequest {
  const payload: CreateTechnicianRequest = {
    user: { id: Number(form.userId) },
    whatsappNumber: form.whatsappNumber.trim() || undefined,
    currentWorkload: Number(form.currentWorkload) || 0,
    isAvailable: form.isAvailable,
  };
  if (form.regionId.trim()) {
    payload.region = { id: Number(form.regionId) };
  } else {
    payload.region = null;
  }
  return payload;
}

export default function TeknisyenlerPage() {
  const toast = useToast();

  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [selected, setSelected] = useState<Technician | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState("");
  const [detailLoading, setDetailLoading] = useState(false);

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

  useEffect(() => {
    void fetchAll();
  }, [fetchAll]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return technicians;
    return technicians.filter((t) => {
      return (
        String(t.id).includes(q) ||
        t.user?.fullName?.toLowerCase().includes(q) ||
        t.user?.email?.toLowerCase().includes(q) ||
        t.whatsappNumber?.toLowerCase().includes(q) ||
        t.region?.name?.toLowerCase().includes(q)
      );
    });
  }, [technicians, search]);

  const closeModal = () => {
    setModalMode(null);
    setSelected(null);
    setForm(emptyForm);
    setActionError("");
  };

  const openCreate = () => {
    setForm(emptyForm);
    setActionError("");
    setModalMode("create");
  };

  const openEdit = async (id: number) => {
    setModalMode("edit");
    setDetailLoading(true);
    setActionError("");
    try {
      const data = await technicianService.getById(id);
      setSelected(data);
      setForm({
        userId: String(data.user?.id ?? ""),
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

    if (!form.userId.trim()) {
      setActionError("Kullanıcı ID zorunludur");
      return;
    }

    const payload = toPayload(form);
    setActionLoading(true);
    try {
      if (modalMode === "create") {
        await technicianService.create(payload);
        toast.success("Teknisyen oluşturuldu");
      } else if (modalMode === "edit" && selected) {
        await technicianService.update(
          selected.id,
          payload as UpdateTechnicianRequest
        );
        toast.success("Teknisyen güncellendi");
      }
      closeModal();
      await fetchAll();
    } catch (err) {
      const apiErr = err as ApiError;
      setActionError(apiErr.message || "İşlem başarısız");
    } finally {
      setActionLoading(false);
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
    <div className="space-y-6 sm:space-y-8">
      <PageHeader
        title="Teknisyenler"
        description="Saha teknisyenlerini yönetin"
        icon={<Wrench className="h-5 w-5" />}
        action={
          <Button type="button" onClick={openCreate}>
            <Plus className="mr-1.5 h-4 w-4" />
            Yeni Teknisyen
          </Button>
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
            placeholder="Ara (ad, e-posta, bölge…)"
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
                    <TableHead>ID</TableHead>
                    <TableHead>Ad Soyad</TableHead>
                    <TableHead>E-posta</TableHead>
                    <TableHead>Bölge</TableHead>
                    <TableHead>WhatsApp</TableHead>
                    <TableHead>İş Yükü</TableHead>
                    <TableHead>Müsait</TableHead>
                    <TableHead>İşlem</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell className="font-medium text-slate-900">
                        #{t.id}
                      </TableCell>
                      <TableCell>{t.user?.fullName || "—"}</TableCell>
                      <TableCell>{t.user?.email || "—"}</TableCell>
                      <TableCell>{t.region?.name || "—"}</TableCell>
                      <TableCell>{t.whatsappNumber || "—"}</TableCell>
                      <TableCell>{t.currentWorkload ?? 0}</TableCell>
                      <TableCell>
                        <Badge variant={t.isAvailable ? "success" : "neutral"}>
                          {t.isAvailable ? "Evet" : "Hayır"}
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
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openEdit(t.id)}
                            title="Düzenle"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="danger"
                            onClick={() => openDelete(t)}
                            title="Sil"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="space-y-3 md:hidden">
              {filtered.map((t) => (
                <div
                  key={t.id}
                  className="rounded-xl border border-slate-200 bg-white p-4 shadow-soft"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-slate-900">
                        {t.user?.fullName || `Teknisyen #${t.id}`}
                      </p>
                      <p className="text-xs text-slate-500">
                        {t.user?.email || "—"}
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
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openEdit(t.id)}
                    >
                      Düzenle
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => openDelete(t)}
                    >
                      Sil
                    </Button>
                  </div>
                </div>
              ))}
            </div>
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
        {detailLoading ? (
          <p className="text-sm text-slate-500">Yükleniyor…</p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {actionError && <ErrorMessage message={actionError} />}

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Kullanıcı ID
              </label>
              <input
                type="number"
                min={1}
                required
                className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm"
                value={form.userId}
                onChange={(e) =>
                  setForm((f) => ({ ...f, userId: e.target.value }))
                }
              />
              <p className="mt-1 text-xs text-slate-400">
                Backend `user` zorunlu; önce kullanıcı kaydı oluşturulmalı.
              </p>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Bölge ID (opsiyonel)
              </label>
              <input
                type="number"
                min={1}
                className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm"
                value={form.regionId}
                onChange={(e) =>
                  setForm((f) => ({ ...f, regionId: e.target.value }))
                }
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                WhatsApp
              </label>
              <input
                type="text"
                className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm"
                value={form.whatsappNumber}
                onChange={(e) =>
                  setForm((f) => ({ ...f, whatsappNumber: e.target.value }))
                }
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  İş Yükü
                </label>
                <input
                  type="number"
                  min={0}
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm"
                  value={form.currentWorkload}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      currentWorkload: e.target.value,
                    }))
                  }
                />
              </div>
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
                    className="h-4 w-4 rounded border-slate-300"
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
          selected
            ? `Teknisyen #${selected.id}`
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
                label: "Müsait",
                value: selected.isAvailable ? "Evet" : "Hayır",
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
              <strong>{selected.user?.fullName || `#${selected.id}`}</strong>{" "}
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
