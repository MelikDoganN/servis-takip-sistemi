"use client";

import { FormEvent, useEffect, useState } from "react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { CreateCustomerRequest, Customer } from "@/types/customer";

interface CustomerFormProps {
  initialValues?: Partial<Customer>;
  submitLabel?: string;
  onSubmit: (data: CreateCustomerRequest) => Promise<void>;
  onCancel: () => void;
}

interface FormErrors {
  fullName?: string;
}

export function CustomerForm({
  initialValues,
  submitLabel = "Kaydet",
  onSubmit,
  onCancel,
}: CustomerFormProps) {
  const [fullName, setFullName] = useState(initialValues?.fullName ?? "");
  const [phone, setPhone] = useState(initialValues?.phone ?? "");
  const [whatsappNumber, setWhatsappNumber] = useState(initialValues?.whatsappNumber ?? "");
  const [email, setEmail] = useState(initialValues?.email ?? "");
  const [address, setAddress] = useState(initialValues?.address ?? "");
  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState("");

  useEffect(() => {
    setFullName(initialValues?.fullName ?? "");
    setPhone(initialValues?.phone ?? "");
    setWhatsappNumber(initialValues?.whatsappNumber ?? "");
    setEmail(initialValues?.email ?? "");
    setAddress(initialValues?.address ?? "");
  }, [initialValues]);

  const validate = (): boolean => {
    const newErrors: FormErrors = {};
    if (!fullName.trim()) {
      newErrors.fullName = "Ad soyad boş olamaz";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitError("");
    if (!validate()) return;

    setLoading(true);
    try {
      await onSubmit({
        fullName: fullName.trim(),
        phone: phone.trim() || undefined,
        whatsappNumber: whatsappNumber.trim() || undefined,
        email: email.trim() || undefined,
        address: address.trim() || undefined,
      });
    } catch (err) {
      const apiErr = err as { message?: string };
      setSubmitError(apiErr.message || "İşlem başarısız oldu");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        label="Ad Soyad"
        value={fullName}
        onChange={(e) => setFullName(e.target.value)}
        error={errors.fullName}
        required
      />
      <Input label="Telefon" value={phone} onChange={(e) => setPhone(e.target.value)} />
      <Input
        label="WhatsApp Numarası"
        value={whatsappNumber}
        onChange={(e) => setWhatsappNumber(e.target.value)}
      />
      <Input
        label="E-posta"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <Input label="Adres" value={address} onChange={(e) => setAddress(e.target.value)} />

      {submitError && <p className="text-sm text-red-600">{submitError}</p>}

      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          İptal
        </Button>
        <Button type="submit" loading={loading}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
