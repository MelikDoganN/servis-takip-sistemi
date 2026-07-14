"use client";

import { FormEvent, useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { SectionCard } from "@/components/ui/SectionCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { authService } from "@/services/authService";
import { ApiError } from "@/types/api";
import { UserCog } from "lucide-react";

interface FormErrors {
  fullName?: string;
  email?: string;
  password?: string;
}

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function KullaniciYonetimiPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState("");
  const [success, setSuccess] = useState("");

  const resetForm = () => {
    setFullName("");
    setEmail("");
    setPassword("");
    setPhone("");
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
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleRegister = async (e: FormEvent) => {
    e.preventDefault();
    setFormError("");
    setSuccess("");
    if (!validate()) return;

    setLoading(true);
    try {
      const result = await authService.register({
        fullName: fullName.trim(),
        email: email.trim(),
        password,
        phone: phone.trim() || undefined,
      });
      setSuccess(result.message || "Kullanıcı kaydedildi.");
      closeModal();
    } catch (err) {
      const apiErr = err as ApiError;
      setFormError(apiErr.message || "Kayıt oluşturulamadı");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8">
      <PageHeader
        title="Kullanıcı Yönetimi"
        description="Yeni sistem kullanıcısı kaydı oluşturun. Listeleme ve rol yönetimi bu ekranın kapsamı dışındadır."
        icon={<UserCog className="h-5 w-5" />}
        action={
          <Button onClick={() => setModalOpen(true)}>
            Yeni Kullanıcı
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

      <SectionCard title="Kayıt">
        <p className="mb-4 text-sm text-slate-600">
          Bu ekran yalnızca <strong>yeni kullanıcı kaydı</strong> (`POST /auth/register`) içindir.
          Kullanıcı listeleme, düzenleme veya rol atama işlemleri burada yapılamaz.
        </p>
        <Button onClick={() => setModalOpen(true)}>Yeni Kullanıcı Kaydet</Button>
      </SectionCard>

      <SectionCard title="Kullanıcı Listesi">
        <EmptyState
          title="Listeleme henüz aktif değil"
          description="Kullanıcı listeleme ve yönetim işlemleri için backend API henüz tamamlanmadı"
        />
      </SectionCard>

      <Modal isOpen={modalOpen} onClose={closeModal} title="Yeni Kullanıcı Kaydı" size="md">
        <form onSubmit={handleRegister} className="space-y-4" noValidate>
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
          <Input label="Telefon" value={phone} onChange={(e) => setPhone(e.target.value)} />
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={closeModal}>
              İptal
            </Button>
            <Button type="submit" loading={loading}>
              Kaydet
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
