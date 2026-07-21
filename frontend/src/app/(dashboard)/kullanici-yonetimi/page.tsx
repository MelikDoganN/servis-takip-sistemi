"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { UserCog, Plus } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { SectionCard } from "@/components/ui/SectionCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { Badge } from "@/components/ui/Badge";
import { SearchInput } from "@/components/ui/SearchInput";
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
import {
  CreateUserRequest,
  User,
} from "@/types/user";
import {
  MANAGEABLE_ROLES,
  BackendRoleName,
  normalizeRoleName,
  roleLabel,
} from "@/types/role";
import { getAuthEmail } from "@/lib/auth";
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
  const authEmail = getAuthEmail();

  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [forbidden, setForbidden] = useState(false);
  const [search, setSearch] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<CreateUserRequest["role"]>("CENTER_OPERATOR");
  const [errors, setErrors] = useState<FormErrors>({});
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState("");

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError("");
    setForbidden(false);
    try {
      const data = await userService.getAll();
      setUsers(Array.isArray(data) ? data : []);
    } catch (err) {
      const apiErr = err as ApiError;
      if (apiErr.status === 403) {
        setForbidden(true);
        setError(
          "Bu işlem için ADMIN yetkisi gerekir. (/api/users → hasRole('ADMIN'), authority: ROLE_ADMIN)"
        );
      } else if (apiErr.status === 401) {
        setError("Oturum doğrulaması gerekli. Lütfen tekrar giriş yapın.");
      } else {
        setError(apiErr.message || "Kullanıcılar yüklenemedi");
      }
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchUsers();
  }, [fetchUsers]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return users;
    return users.filter((u) => {
      const roleName = normalizeRoleName(u.role?.name ?? "").toLowerCase();
      return (
        u.fullName?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q) ||
        u.phone?.toLowerCase().includes(q) ||
        roleName.includes(q)
      );
    });
  }, [users, search]);

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
        setFormError("Yalnızca ADMIN kullanıcı oluşturabilir.");
      } else {
        setFormError(apiErr.message || "Kullanıcı oluşturulamadı");
      }
    } finally {
      setFormLoading(false);
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8">
      <PageHeader
        title="Kullanıcı Yönetimi"
        description="Admin paneli — GET/POST /api/users (ROLE_ADMIN gerekir)"
        icon={<UserCog className="h-5 w-5" />}
        action={
          <Button
            onClick={() => setModalOpen(true)}
            disabled={forbidden}
            title={forbidden ? "ADMIN yetkisi gerekli" : undefined}
          >
            <Plus className="mr-1.5 h-4 w-4" />
            Yeni Kullanıcı
          </Button>
        }
      />

      {authEmail && (
        <p className="text-xs text-slate-500">
          Oturum (JWT subject): <span className="font-medium text-slate-700">{authEmail}</span>
          {" · "}Rol claim JWT’de yok; yetki sunucuda kontrol edilir.
        </p>
      )}

      {error && <ErrorMessage message={error} />}

      {forbidden ? (
        <SectionCard title="Yetki Gerekli">
          <EmptyState
            title="ADMIN erişimi gerekli"
            description="Bu ekran @PreAuthorize(hasRole('ADMIN')) korumalıdır. ROLE_ADMIN yetkili bir hesapla giriş yapın."
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
              placeholder="Ara (ad, e-posta, rol…)"
            />
          }
        >
          {loading ? (
            <SkeletonTable rows={6} />
          ) : filtered.length === 0 ? (
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
                      <TableHead>ID</TableHead>
                      <TableHead>Ad Soyad</TableHead>
                      <TableHead>E-posta</TableHead>
                      <TableHead>Telefon</TableHead>
                      <TableHead>Rol</TableHead>
                      <TableHead>Durum</TableHead>
                      <TableHead>Oluşturma</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((u) => (
                      <TableRow key={u.id}>
                        <TableCell className="font-medium text-slate-900">
                          #{u.id}
                        </TableCell>
                        <TableCell>{u.fullName}</TableCell>
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
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="space-y-3 md:hidden">
                {filtered.map((u) => (
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
                  </div>
                ))}
              </div>
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
                  {roleLabel(r)} ({r})
                </option>
              ))}
            </select>
            {errors.role && (
              <p className="mt-1.5 text-sm text-red-600">{errors.role}</p>
            )}
            <p className="mt-1 text-xs text-slate-400">
              Backend role adı (ROLE_ prefix yok). Security authority: ROLE_
              {(role as BackendRoleName) || "…"}
            </p>
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
    </div>
  );
}
