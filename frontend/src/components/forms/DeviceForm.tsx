"use client";

import { FormEvent, useState } from "react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { CreateDeviceRequest } from "@/types/device";
import { Customer } from "@/types/customer";

interface DeviceFormProps {
  customers: Customer[];
  onSubmit: (data: CreateDeviceRequest) => Promise<void>;
  onCancel: () => void;
}

interface FormErrors {
  customerId?: string;
  modelId?: string;
  serialNumber?: string;
}

export function DeviceForm({ customers, onSubmit, onCancel }: DeviceFormProps) {
  const [customerId, setCustomerId] = useState("");
  const [modelId, setModelId] = useState("");
  const [serialNumber, setSerialNumber] = useState("");
  const [purchaseDate, setPurchaseDate] = useState("");
  const [installationDate, setInstallationDate] = useState("");
  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const validate = (): boolean => {
    const newErrors: FormErrors = {};
    if (!customerId) newErrors.customerId = "Müşteri seçilmelidir";
    if (!modelId || isNaN(Number(modelId))) newErrors.modelId = "Geçerli model ID girin";
    if (!serialNumber.trim()) newErrors.serialNumber = "Seri numarası boş olamaz";
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
        customer: { id: Number(customerId) },
        model: { id: Number(modelId) },
        serialNumber: serialNumber.trim(),
        purchaseDate: purchaseDate || undefined,
        installationDate: installationDate || undefined,
      });
    } catch (err) {
      const apiErr = err as { message?: string };
      setSubmitError(apiErr.message || "Cihaz oluşturulamadı");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="w-full">
        <label htmlFor="customerId" className="mb-1.5 block text-sm font-medium text-gray-700">
          Müşteri
        </label>
        <select
          id="customerId"
          value={customerId}
          onChange={(e) => setCustomerId(e.target.value)}
          className={`block w-full rounded-lg border px-3 py-2 text-sm ${
            errors.customerId ? "border-red-500" : "border-gray-300"
          }`}
        >
          <option value="">Müşteri seçin</option>
          {customers.map((c) => (
            <option key={c.id} value={c.id}>
              {c.fullName}
            </option>
          ))}
        </select>
        {errors.customerId && <p className="mt-1.5 text-sm text-red-600">{errors.customerId}</p>}
      </div>

      <Input
        label="Model ID"
        type="number"
        value={modelId}
        onChange={(e) => setModelId(e.target.value)}
        error={errors.modelId}
      />

      <Input
        label="Seri Numarası"
        value={serialNumber}
        onChange={(e) => setSerialNumber(e.target.value)}
        error={errors.serialNumber}
        required
      />

      <Input
        label="Satın Alma Tarihi"
        type="date"
        value={purchaseDate}
        onChange={(e) => setPurchaseDate(e.target.value)}
      />

      <Input
        label="Kurulum Tarihi"
        type="date"
        value={installationDate}
        onChange={(e) => setInstallationDate(e.target.value)}
      />

      {submitError && <p className="text-sm text-red-600">{submitError}</p>}

      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          İptal
        </Button>
        <Button type="submit" loading={loading}>
          Kaydet
        </Button>
      </div>
    </form>
  );
}
