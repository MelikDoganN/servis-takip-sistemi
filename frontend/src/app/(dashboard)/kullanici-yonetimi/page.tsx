"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import {
  UserCog,
  Plus,
  Pencil,
  Shield,
  Power,
} from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { SectionCard } from "@/components/ui/SectionCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { Badge } from "@/components/ui/Badge";
import { SearchInput } from "@/components/ui/SearchInput";
import { Pagination } from "@/components/ui/Pagination";
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
import { userService } from "@/services/userService";
import { ApiError } from "@/types/api";
import { CreateUserRequest, User } from "@/types/user";
import {
  ASSIGNABLE_ROLES,
  BackendRoleName,
  MANAGEABLE_ROLES,
  normalizeRoleName,
  roleLabel,
} from "@/types/role";
import { formatDateTime } from "@/lib/utils";

interface FormErrors {
  fullName?: string;
  email?: string;
  password?: string;
  role?: string;
}

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function roleBadgeVariant(
  roleName?: string | null
): "default" | "success" | "warning" | "danger" | "info" | "neutral" {
  const key = normalizeRoleName(roleName ?? "");
  switch (key) {
    case "ADMIN":
      return "danger";
    case "CENTER_OPERATOR":
      return "info";
    case "REGION_MANAGER":
      return "warning";
    case "TECHNICIAN":
      return "success";
    default:
      return "neutral";
  }
}

export default function KullaniciYonetimiPage() {
  const toast = useToast();

  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [forbidden, setForbidden] = useState(false);
  const [search, setSearch] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);

  const [modalOpen, setModalOpen] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<CreateUserRequest["role"]>("CENTER_OPERATOR");
  const [errors, setErrors] = useState<FormErrors>({});
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState("");

  const [editOpen, setEditOpen] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [editFullName, setEditFullName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editErrors, setEditErrors] = useState<FormErrors>({});
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState("");

  const [roleOpen, setRoleOpen] = useState(false);
  const [roleUser, setRoleUser] = useState<User | null>(null);
  const [selectedRole, setSelectedRole] = useState<BackendRoleName>("CENTER_OPERATOR");
  const [roleLoading, setRoleLoading] = useState(false);
  const [roleError, setRoleError] = useState("");

  const [toggleLoadingId, setToggleLoadingId] = useState<number | null>(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError("");
    setForbidden(false);
    try {
      const data = await userService.getPage(page, pageSize, searchQuery || undefined);
      setUsers(data.content ?? []);
      setTotalPages(data.totalPages ?? 0);
      setTotalElements(data.totalElements ?? 0);
    } catch (err) {
      const apiErr = err as ApiError;
      if (apiErr.status === 403) {
        setForbidden(true);
        setError("Bu işlem için yönetici yetkisi gerekir.");
      } else if (apiErr.status === 401) {
        setError("Oturum doğrulaması gerekli. Lütfen tekrar giriş yapın.");
      } else {
        setError(apiErr.message || "Kullanıcılar yüklenemedi");
      }
      setUsers([]);
      setTotalPages(0);
      setTotalElements(0);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, searchQuery]);

  useEffect(() => {
    void fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get("q");
    if (q) setSearch(q);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      setPage(0);
      setSearchQuery(search);
    }, 350);
    return () => clearTimeout(t);
  }, [search]);

  const resetForm = () => {
    setFullName("");
    setEmail("");
    setPassword("");
    setPhone("");
    setRole("CENTER_OPERATOR");
    setErrors({});
    setFormError("");
  };

  const closeModal = () => {
    setModalOpen(false);
    resetForm();
  };

  const validate = (): boolean => {
    const next: FormErrors = {};
    if (!fullName.trim()) next.fullName = "Ad soyad boş olamaz";
    if (!email.trim()) next.email = "E-posta boş olamaz";
    else if (!emailRegex.test(email)) next.email = "Geçerli bir e-posta girin";
    if (!password.trim()) next.password = "Şifre boş olamaz";
    if (!role) next.role = "Rol seçilmelidir";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    setFormError("");
    if (!validate()) return;

    const payload: CreateUserRequest = {
      fullName: fullName.trim(),
      email: email.trim(),
      password,
      phone: phone.trim() || undefined,
      role,
    };

    setFormLoading(true);
    try {
      const result = await userService.create(payload);
      toast.success(result.message || "Kullanıcı oluşturuldu");
      closeModal();
      await fetchUsers();
    } catch (err) {
      const apiErr = err as ApiError;
      if (apiErr.status === 403) {
        setFormError("Bu işlem için yönetici yetkisi gerekir.");
      } else {
        setFormError(apiErr.message || "Kullanıcı oluşturulamadı");
      }
    } finally {
      setFormLoading(false);
    }
  };

  const openEdit = (u: User) => {
    setEditUser(u);
    setEditFullName(u.fullName);
    setEditEmail(u.email);
    setEditPhone(u.phone || "");
    setEditErrors({});
    setEditError("");
    setEditOpen(true);
  };

  const closeEdit = () => {
    setEditOpen(false);
    setEditUser(null);
    setEditErrors({});
    setEditError("");
  };

  const validateEdit = (): boolean => {
    const next: FormErrors = {};
    if (!editFullName.trim()) next.fullName = "Ad soyad boş olamaz";
    if (!editEmail.trim()) next.email = "E-posta boş olamaz";
    else if (!emailRegex.test(editEmail)) next.email = "Geçerli bir e-posta girin";
    setEditErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleEdit = async (e: FormEvent) => {
    e.preventDefault();
    if (!editUser) return;
    setEditError("");
    if (!validateEdit()) return;

    setEditLoading(true);
    try {
      await userService.update(editUser.id, {
        fullName: editFullName.trim(),
        email: editEmail.trim(),
        phone: editPhone.trim() || null,
      });
      toast.success("Kullanıcı güncellendi");
      closeEdit();
      await fetchUsers();
    } catch (err) {
      const apiErr = err as ApiError;
      setEditError(apiErr.message || "Kullanıcı güncellenemedi");
    } finally {
      setEditLoading(false);
    }
  };

  const openRole = (u: User) => {
    const current = normalizeRoleName(u.role?.name ?? "") as BackendRoleName;
    setRoleUser(u);
    setSelectedRole(
      ASSIGNABLE_ROLES.includes(current) ? current : "CENTER_OPERATOR"
    );
    setRoleError("");
    setRoleOpen(true);
  };

  const closeRole = () => {
    setRoleOpen(false);
    setRoleUser(null);
    setRoleError("");
  };

  const handleRoleChange = async (e: FormEvent) => {
    e.preventDefault();
    if (!roleUser) return;
    setRoleError("");
    setRoleLoading(true);
    try {
      await userService.updateRole(roleUser.id, selectedRole);
      toast.success("Rol güncellendi");
      closeRole();
      await fetchUsers();
    } catch (err) {
      const apiErr = err as ApiError;
      setRoleError(apiErr.message || "Rol değiştirilemedi");
    } finally {
      setRoleLoading(false);
    }
  };

  const handleToggleActive = async (u: User) => {
    setToggleLoadingId(u.id);
    try {
      await userService.update(u.id, { isActive: !u.isActive });
      toast.success(u.isActive ? "Kullanıcı pasife alındı" : "Kullanıcı aktifleştirildi");
      await fetchUsers();
    } catch (err) {
      const apiErr = err as ApiError;
      toast.error(apiErr.message || "Durum değiştirilemedi");
    } finally {
      setToggleLoadingId(null);
    }
  };

  const actionButtons = (u: User) => (
    <div className="flex flex-wrap justify-end gap-1">
      <Button
        variant="outline"
        size="sm"
        onClick={() => openEdit(u)}
        title="Kullanıcıyı düzenle"
      >
        <Pencil className="h-3.5 w-3.5" />
        <span className="hidden lg:inline">Düzenle</span>
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => openRole(u)}
        title="Rol değiştir"
      >
        <Shield className="h-3.5 w-3.5" />
        <span className="hidden lg:inline">Rol</span>
      </Button>
      <Button
        variant={u.isActive ? "danger" : "secondary"}
        size="sm"
        loading={toggleLoadingId === u.id}
        onClick={() => void handleToggleActive(u)}
        title={u.isActive ? "Pasife al" : "Aktifleştir"}
      >
        <Power className="h-3.5 w-3.5" />
        <span className="hidden lg:inline">
          {u.isActive ? "Pasif" : "Aktif"}
        </span>
      </Button>
    </div>
  );

  return (
    <div className="space-y-6 sm:space-y-8">
      <PageHeader
        title="Kullanıcı Yönetimi"
        description="Sistem kullanıcılarını görüntüleyin ve yönetin"
        icon={<UserCog className="h-5 w-5" />}
        action={
          <Button
            onClick={() => setModalOpen(true)}
            disabled={forbidden}
            title={forbidden ? "Yönetici yetkisi gerekli" : undefined}
          >
            <Plus className="mr-1.5 h-4 w-4" />
            Yeni Kullanıcı
          </Button>
        }
      />

      {error && <ErrorMessage message={error} />}

      {forbidden ? (
        <SectionCard title="Yetki Gerekli">
          <EmptyState
            title="Erişim yetkiniz yok"
            description="Bu sayfayı görüntülemek için yönetici yetkisine sahip bir hesapla giriş yapın."
          />
        </SectionCard>
      ) : (
        <SectionCard
          title="Kullanıcı Listesi"
          description="Sistem kullanıcıları ve roller"
          action={
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Ada göre ara…"
            />
          }
        >
          {loading ? (
            <SkeletonTable rows={6} />
          ) : users.length === 0 ? (
            <EmptyState
              title="Kullanıcı bulunamadı"
              description="Yeni kullanıcı oluşturarak başlayabilirsiniz"
            />
          ) : (
            <>
              <div className="hidden overflow-x-auto md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ad Soyad</TableHead>
                      <TableHead>E-posta</TableHead>
                      <TableHead>Telefon</TableHead>
                      <TableHead>Rol</TableHead>
                      <TableHead>Durum</TableHead>
                      <TableHead>Oluşturma</TableHead>
                      <TableHead className="text-right">İşlemler</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((u) => (
                      <TableRow key={u.id}>
                        <TableCell className="font-medium text-slate-900">
                          {u.fullName}
                        </TableCell>
                        <TableCell>{u.email}</TableCell>
                        <TableCell>{u.phone || "—"}</TableCell>
                        <TableCell>
                          <Badge variant={roleBadgeVariant(u.role?.name)}>
                            {roleLabel(u.role?.name)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={u.isActive ? "success" : "neutral"}>
                            {u.isActive ? "Aktif" : "Pasif"}
                          </Badge>
                        </TableCell>
                        <TableCell>{formatDateTime(u.createdAt)}</TableCell>
                        <TableCell>{actionButtons(u)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="space-y-3 md:hidden">
                {users.map((u) => (
                  <div
                    key={u.id}
                    className="rounded-xl border border-slate-200 bg-white p-4 shadow-soft"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-slate-900">{u.fullName}</p>
                        <p className="text-xs text-slate-500">{u.email}</p>
                      </div>
                      <Badge variant={roleBadgeVariant(u.role?.name)}>
                        {roleLabel(u.role?.name)}
                      </Badge>
                    </div>
                    <p className="mt-2 text-xs text-slate-400">
                      {u.isActive ? "Aktif" : "Pasif"} · {formatDateTime(u.createdAt)}
                    </p>
                    <div className="mt-3 border-t border-slate-100 pt-3">
                      {actionButtons(u)}
                    </div>
                  </div>
                ))}
              </div>

              <Pagination
                currentPage={page + 1}
                totalPages={totalPages}
                totalItems={totalElements}
                pageSize={pageSize}
                onPageChange={(p) => setPage(p - 1)}
                onPageSizeChange={(size) => {
                  setPageSize(size);
                  setPage(0);
                }}
              />
            </>
          )}
        </SectionCard>
      )}

      <Modal
        isOpen={modalOpen}
        onClose={closeModal}
        title="Yeni Kullanıcı"
        size="md"
      >
        <form onSubmit={handleCreate} className="space-y-4" noValidate>
          {formError && <ErrorMessage message={formError} />}

          <Input
            label="Ad Soyad"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            error={errors.fullName}
            required
          />
          <Input
            label="E-posta"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={errors.email}
            required
          />
          <Input
            label="Şifre"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={errors.password}
            required
          />
          <Input
            label="Telefon"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Rol
            </label>
            <select
              className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm"
              value={role}
              onChange={(e) =>
                setRole(e.target.value as CreateUserRequest["role"])
              }
            >
              {MANAGEABLE_ROLES.map((r) => (
                <option key={r} value={r}>
                  {roleLabel(r)}
                </option>
              ))}
            </select>
            {errors.role && (
              <p className="mt-1.5 text-sm text-red-600">{errors.role}</p>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={closeModal}>
              İptal
            </Button>
            <Button type="submit" loading={formLoading}>
              Oluştur
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={editOpen}
        onClose={closeEdit}
        title="Kullanıcı Düzenle"
        size="md"
      >
        <form onSubmit={handleEdit} className="space-y-4" noValidate>
          {editError && <ErrorMessage message={editError} />}

          <Input
            label="Ad Soyad"
            value={editFullName}
            onChange={(e) => setEditFullName(e.target.value)}
            error={editErrors.fullName}
            required
          />
          <Input
            label="E-posta"
            type="email"
            value={editEmail}
            onChange={(e) => setEditEmail(e.target.value)}
            error={editErrors.email}
            required
          />
          <Input
            label="Telefon"
            value={editPhone}
            onChange={(e) => setEditPhone(e.target.value)}
          />

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={closeEdit}>
              İptal
            </Button>
            <Button type="submit" loading={editLoading}>
              Kaydet
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={roleOpen}
        onClose={closeRole}
        title="Rol Değiştir"
        size="sm"
      >
        <form onSubmit={handleRoleChange} className="space-y-4" noValidate>
          {roleError && <ErrorMessage message={roleError} />}

          {roleUser && (
            <p className="text-sm text-slate-600">
              <span className="font-medium text-slate-900">{roleUser.fullName}</span>
              {" · "}
              Mevcut: {roleLabel(roleUser.role?.name)}
            </p>
          )}

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Yeni Rol
            </label>
            <select
              className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm"
              value={selectedRole}
              onChange={(e) =>
                setSelectedRole(e.target.value as BackendRoleName)
              }
            >
              {ASSIGNABLE_ROLES.map((r) => (
                <option key={r} value={r}>
                  {roleLabel(r)}
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={closeRole}>
              İptal
            </Button>
            <Button type="submit" loading={roleLoading}>
              Rolü Kaydet
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
