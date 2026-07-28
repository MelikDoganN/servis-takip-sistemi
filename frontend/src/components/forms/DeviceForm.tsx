"use client";

import { FormEvent, useEffect, useState } from "react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { CreateDeviceRequest, Device } from "@/types/device";
import { Customer } from "@/types/customer";
import { Brand } from "@/types/brand";
import { DeviceModel } from "@/types/deviceModel";
import { brandService } from "@/services/brandService";
import { deviceModelService } from "@/services/deviceModelService";
import { ApiError } from "@/types/api";

interface DeviceFormProps {
  customers: Customer[];
  initialValues?: Device;
  submitLabel?: string;
  onSubmit: (data: CreateDeviceRequest) => Promise<void>;
  onCancel: () => void;
}

interface FormErrors {
  customerId?: string;
  brandId?: string;
  modelId?: string;
  serialNumber?: string;
}

export function DeviceForm({
  customers,
  initialValues,
  submitLabel = "Kaydet",
  onSubmit,
  onCancel,
}: DeviceFormProps) {
  const [customerId, setCustomerId] = useState(
    initialValues?.customer?.id ? String(initialValues.customer.id) : ""
  );
  const [brandId, setBrandId] = useState(
    initialValues?.model?.brand?.id ? String(initialValues.model.brand.id) : ""
  );
  const [modelId, setModelId] = useState(
    initialValues?.model?.id ? String(initialValues.model.id) : ""
  );
  const [serialNumber, setSerialNumber] = useState(initialValues?.serialNumber ?? "");
  const [purchaseDate, setPurchaseDate] = useState(initialValues?.purchaseDate ?? "");
  const [installationDate, setInstallationDate] = useState(
    initialValues?.installationDate ?? ""
  );
  const [brands, setBrands] = useState<Brand[]>([]);
  const [models, setModels] = useState<DeviceModel[]>([]);
  const [lookupsLoading, setLookupsLoading] = useState(true);
  const [modelsLoading, setModelsLoading] = useState(false);
  const [lookupError, setLookupError] = useState("");
  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState("");

  useEffect(() => {
    setCustomerId(initialValues?.customer?.id ? String(initialValues.customer.id) : "");
    setBrandId(
      initialValues?.model?.brand?.id ? String(initialValues.model.brand.id) : ""
    );
    setModelId(initialValues?.model?.id ? String(initialValues.model.id) : "");
    setSerialNumber(initialValues?.serialNumber ?? "");
    setPurchaseDate(initialValues?.purchaseDate ?? "");
    setInstallationDate(initialValues?.installationDate ?? "");
  }, [initialValues]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLookupsLoading(true);
      setLookupError("");
      try {
        const data = await brandService.getAll();
        if (!cancelled) setBrands(Array.isArray(data) ? data : []);
      } catch (err) {
        if (!cancelled) {
          const apiErr = err as ApiError;
          setLookupError(apiErr.message || "Markalar yüklenemedi");
          setBrands([]);
        }
      } finally {
        if (!cancelled) setLookupsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!brandId) {
      setModels([]);
      return;
    }
    let cancelled = false;
    (async () => {
      setModelsLoading(true);
      try {
        const data = await deviceModelService.getAll(Number(brandId));
        if (!cancelled) {
          setModels(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        if (!cancelled) {
          const apiErr = err as ApiError;
          setLookupError(apiErr.message || "Modeller yüklenemedi");
          setModels([]);
        }
      } finally {
        if (!cancelled) setModelsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [brandId]);

  const validate = (): boolean => {
    const newErrors: FormErrors = {};
    if (!customerId) newErrors.customerId = "Müşteri seçilmelidir";
    if (!brandId) newErrors.brandId = "Marka seçilmelidir";
    if (!modelId) newErrors.modelId = "Model seçilmelidir";
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
      setSubmitError(apiErr.message || "İşlem başarısız oldu");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {lookupError && <p className="text-sm text-red-600">{lookupError}</p>}

      <div className="w-full">
        <label htmlFor="customerId" className="mb-1.5 block text-sm font-medium text-gray-700">
          Müşteri
        </label>
        <select
          id="customerId"
          value={customerId}
          onChange={(e) => setCustomerId(e.target.value)}
          className={
            errors.customerId
              ? "field-base border-red-400 focus:border-red-500 focus:ring-red-500/15"
              : "field-base"
          }
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

      <div className="w-full">
        <label htmlFor="brandId" className="mb-1.5 block text-sm font-medium text-gray-700">
          Marka
        </label>
        <select
          id="brandId"
          value={brandId}
          disabled={lookupsLoading}
          onChange={(e) => {
            setBrandId(e.target.value);
            setModelId("");
          }}
          className={
            errors.brandId
              ? "field-base border-red-400 focus:border-red-500 focus:ring-red-500/15"
              : "field-base"
          }
        >
          <option value="">
            {lookupsLoading ? "Markalar yükleniyor…" : "Marka seçin"}
          </option>
          {brands.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
        {errors.brandId && <p className="mt-1.5 text-sm text-red-600">{errors.brandId}</p>}
      </div>

      <div className="w-full">
        <label htmlFor="modelId" className="mb-1.5 block text-sm font-medium text-gray-700">
          Model
        </label>
        <select
          id="modelId"
          value={modelId}
          disabled={!brandId || modelsLoading}
          onChange={(e) => setModelId(e.target.value)}
          className={
            errors.modelId
              ? "field-base border-red-400 focus:border-red-500 focus:ring-red-500/15"
              : "field-base"
          }
        >
          <option value="">
            {!brandId
              ? "Önce marka seçin"
              : modelsLoading
                ? "Modeller yükleniyor…"
                : "Model seçin"}
          </option>
          {models.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
              {m.deviceType ? ` (${m.deviceType})` : ""}
            </option>
          ))}
        </select>
        {errors.modelId && <p className="mt-1.5 text-sm text-red-600">{errors.modelId}</p>}
      </div>

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
        value={purchaseDate || ""}
        onChange={(e) => setPurchaseDate(e.target.value)}
      />

      <Input
        label="Kurulum Tarihi"
        type="date"
        value={installationDate || ""}
        onChange={(e) => setInstallationDate(e.target.value)}
      />

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
